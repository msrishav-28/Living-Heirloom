import { useState } from 'react';
import { Menu, X, Clock, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Library', href: '/capsules' },
  ];

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      role="navigation"
      aria-label="Main navigation"
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a 
              href="/" 
              className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
              aria-label="Living Heirloom - Go to homepage"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-serif font-medium">Living Heirloom</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
                aria-label={`Navigate to ${item.name} section`}
              >
                {item.name}
              </a>
            ))}
            <Button 
              className="btn-hero focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => window.location.href = '/create'}
              aria-label="Create a new living heirloom"
            >
              <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
              Create Heirloom
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              className="focus:ring-2 focus:ring-primary"
            >
              {isOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div 
            id="mobile-menu"
            className="md:hidden py-4 border-t border-border"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors py-2 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2"
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  aria-label={`Navigate to ${item.name} section`}
                >
                  {item.name}
                </a>
              ))}
              <Button 
                className="btn-hero w-full mt-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/create';
                }}
                role="menuitem"
                aria-label="Create a new living heirloom"
              >
                <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                Create Heirloom
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;