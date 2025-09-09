import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-6">
      <Card className="card-sacred max-w-2xl w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-4xl font-serif font-light mb-4">Page Not Found</h1>
        
        <p className="text-emotion mb-8 max-w-md mx-auto">
          The page you're looking for seems to have wandered off. 
          Let's help you find your way back to preserving precious memories.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button onClick={handleGoHome} className="btn-hero">
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
          
          <Button variant="outline" onClick={handleGoBack} className="btn-gentle">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <a href="/create" className="text-primary hover:text-primary/80 transition-colors">
              Create Heirloom
            </a>
            <a href="/capsules" className="text-primary hover:text-primary/80 transition-colors">
              View Library
            </a>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-muted/20 rounded-lg text-left">
            <p className="text-xs text-muted-foreground">
              <strong>Development Info:</strong> Attempted to access: {location.pathname}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotFound;
