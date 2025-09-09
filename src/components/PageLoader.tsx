import { Clock } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export const PageLoader = ({ 
  message = "Loading...", 
  className = "" 
}: PageLoaderProps) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-background ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-serif font-medium mb-2">Living Heirloom</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

// Compact loader for inline use
export const InlineLoader = ({ 
  message = "Loading...", 
  className = "" 
}: PageLoaderProps) => {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};