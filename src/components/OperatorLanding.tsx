import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LogIn, 
  Monitor, 
  Globe, 
  Volume2, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Zap, 
  Check,
  Star,
  ArrowRight,
  PlayCircle
} from "lucide-react";
import bmbLogo from "@/assets/bmb-logo.png";

const OperatorLanding = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Monitor,
      title: "Digital Departure Boards",
      description: "Real-time departure displays with automatic updates and beautiful interfaces"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Full support for English, Khmer, and Chinese with easy translation management"
    },
    {
      icon: Volume2,
      title: "AI-Powered Announcements",
      description: "Text-to-speech announcements in multiple languages with voice optimization"
    },
    {
      icon: Users,
      title: "Multi-Operator Management",
      description: "Manage multiple bus operators with separate branding and configurations"
    },
    {
      icon: Settings,
      title: "Fleet Management",
      description: "Complete fleet tracking with vehicle types, statuses, and route management"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive reporting and analytics for operations and performance"
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Secure authentication with operator and super admin role management"
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Instant synchronization across all displays and devices"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small operators",
      features: [
        "Up to 2 operators",
        "5 departure boards",
        "Basic announcements",
        "Email support",
        "Standard templates"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Best for growing businesses",
      features: [
        "Up to 10 operators",
        "Unlimited departure boards",
        "AI-powered announcements",
        "Multi-language support",
        "Priority support",
        "Custom branding",
        "Analytics dashboard"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For large transportation networks",
      features: [
        "Unlimited operators",
        "Unlimited departure boards",
        "Advanced AI features",
        "Custom integrations",
        "24/7 dedicated support",
        "White-label solutions",
        "API access",
        "Custom development"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-dashboard">
      {/* Navigation */}
      <nav className="border-b border-border bg-dashboard-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={bmbLogo} alt="BookMeBus Logo" className="w-8 h-8" />
              <span className="text-2xl font-bold text-text-display">BookMeBus</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="text-primary border-primary/20">
            ✨ Modern Bus Transportation Management
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-text-display leading-tight">
            Smart Departure Boards
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-text-display/70 max-w-3xl mx-auto leading-relaxed">
            Transform your bus terminal with AI-powered departure boards, multi-language announcements, 
            and comprehensive fleet management. Everything you need to modernize passenger experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              <PlayCircle className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-dashboard-surface/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-text-display">
              Everything You Need
            </h2>
            <p className="text-xl text-text-display/70 max-w-2xl mx-auto">
              Comprehensive features designed for modern transportation management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-dashboard-surface border-border hover:border-primary/20 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 space-y-4">
                  <feature.icon className="w-12 h-12 text-primary" />
                  <h3 className="text-xl font-semibold text-text-display">
                    {feature.title}
                  </h3>
                  <p className="text-text-display/70">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-text-display">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-display/70 max-w-2xl mx-auto">
              Choose the perfect plan for your transportation network
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl text-text-display">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-text-display">{plan.price}</span>
                      <span className="text-text-display/70">{plan.period}</span>
                    </div>
                    <p className="text-text-display/70">{plan.description}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-text-display/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-text-display">
            Ready to Transform Your Bus Terminal?
          </h2>
          <p className="text-xl text-text-display/70">
            Join hundreds of transportation companies already using BookMeBus to enhance their passenger experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
              <LogIn className="mr-2 w-5 h-5" />
              Sign In to Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={bmbLogo} alt="BookMeBus Logo" className="w-6 h-6" />
            <span className="text-xl font-bold text-text-display">BookMeBus</span>
          </div>
          <p className="text-text-display/60">
            © {new Date().getFullYear()} BookMeBus. All rights reserved. | Modern bus departure board management.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OperatorLanding;