import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin, MessageSquare } from "lucide-react";

export const DemoSection = () => {
  const sampleMessage = {
    title: "🎾 Tonight's Prime Time Courts",
    content: `Good evening! Here are the available courts for tonight:

🟢 Court 1: 8:00 PM - 9:30 PM
🟢 Court 3: 7:30 PM - 9:00 PM  
🟢 Court 4: 9:00 PM - 10:30 PM

💫 Special Event Tomorrow:
🏆 Weekend Tournament Registration Open
📅 Saturday 9:00 AM - 6:00 PM
👥 Doubles & Singles categories

Book now: https://playtomic.io/book/123456

Questions? Reply to this message! 🎾`,
    timestamp: "Today at 6:30 PM"
  };

  const templates = [
    {
      name: "Court Availability Tonight",
      description: "Prime time court slots for this evening",
      icon: <Clock className="w-5 h-5" />,
      active: true
    },
    {
      name: "Weekend Events Digest", 
      description: "Tournaments and special events summary",
      icon: <Calendar className="w-5 h-5" />,
      active: false
    },
    {
      name: "Last Minute Cancellations",
      description: "Quick notifications for sudden openings", 
      icon: <Users className="w-5 h-5" />,
      active: false
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            See CORTEK in
            <span className="text-primary ml-3">Action</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Here's exactly what your members will receive - professional, 
            timely updates that keep your courts booked and players engaged.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* WhatsApp Message Preview */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Pure Padel Manchester</h3>
                <p className="text-sm text-muted-foreground">WhatsApp Group • 47 members</p>
              </div>
            </div>

            <Card className="p-6 bg-green-50 border-l-4 border-l-green-500">
              <div className="mb-4">
                <Badge variant="secondary" className="mb-2">Auto-Generated Message</Badge>
                <p className="text-sm text-muted-foreground">{sampleMessage.timestamp}</p>
              </div>
              
              <div className="whitespace-pre-line text-sm leading-relaxed">
                {sampleMessage.content}
              </div>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Sent to 3 WhatsApp groups automatically</span>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold mb-6">Choose Your Templates</h3>
            
            <div className="space-y-4">
              {templates.map((template, index) => (
                <Card 
                  key={index} 
                  className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    template.active 
                      ? 'bg-primary/5 border-primary shadow-sm' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        template.active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {template.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    {template.active && (
                      <Badge className="bg-primary text-primary-foreground">Active</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="pt-6">
              <Button variant="hero" size="lg" className="w-full">
                Try CORTEK Free for 14 Days
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-2">
                No credit card required • Setup in under 5 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};