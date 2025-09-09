import { useState } from 'react';
import { Search, Filter, Calendar, Lock, Unlock, Share2, MoreHorizontal, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TimeCapsule {
  id: string;
  title: string;
  recipient: string;
  type: 'legacy' | 'family' | 'future-self';
  status: 'draft' | 'scheduled' | 'delivered' | 'locked';
  createdAt: Date;
  deliveryDate?: Date;
  preview: string;
  wordCount: number;
  isEncrypted: boolean;
}

const CapsuleLibrary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data for demonstration
  const capsules: TimeCapsule[] = [
    {
      id: '1',
      title: 'For My Daughter\'s 18th Birthday',
      recipient: 'Emma',
      type: 'legacy',
      status: 'scheduled',
      createdAt: new Date('2024-01-15'),
      deliveryDate: new Date('2026-03-22'),
      preview: 'My dearest Emma, as you stand on the threshold of adulthood, I want you to know how proud I am of the remarkable young woman you\'ve become...',
      wordCount: 847,
      isEncrypted: true
    },
    {
      id: '2',
      title: 'Wedding Anniversary Surprise',
      recipient: 'My Beloved',
      type: 'family',
      status: 'delivered',
      createdAt: new Date('2024-02-10'),
      deliveryDate: new Date('2024-02-14'),
      preview: 'Twenty-five years ago, you said yes to forever with me. Today, I want to remind you why that was the best decision either of us ever made...',
      wordCount: 1204,
      isEncrypted: false
    },
    {
      id: '3',
      title: 'Wisdom for Future Me',
      recipient: 'Myself in 10 years',
      type: 'future-self',
      status: 'locked',
      createdAt: new Date('2024-01-03'),
      deliveryDate: new Date('2034-01-03'),
      preview: 'Dear Future Self, I wonder what you\'ll think when you read this. Right now, I\'m struggling with some big decisions about my career...',
      wordCount: 623,
      isEncrypted: true
    },
    {
      id: '4',
      title: 'Memories of Grandpa',
      recipient: 'The Grandchildren',
      type: 'legacy',
      status: 'draft',
      createdAt: new Date('2024-02-28'),
      preview: 'I want to tell you about your great-grandfather, a man whose gentle wisdom shaped our entire family. He taught me that kindness is never wasted...',
      wordCount: 445,
      isEncrypted: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'scheduled': return 'bg-primary/10 text-primary';
      case 'delivered': return 'bg-success/10 text-success';
      case 'locked': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'legacy': return 'from-primary to-primary-glow';
      case 'family': return 'from-accent to-accent-glow';
      case 'future-self': return 'from-secondary to-secondary-glow';
      default: return 'from-primary to-primary-glow';
    }
  };

  const filteredCapsules = capsules.filter(capsule => {
    const matchesSearch = capsule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         capsule.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || capsule.type === filterType || capsule.status === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-light mb-2">Your Living Heirlooms</h1>
          <p className="text-emotion">Precious family moments preserved for tomorrow</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search your heirlooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="btn-gentle">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            
            <Button className="btn-hero">
              Create New Heirloom
            </Button>
          </div>
        </div>

        {/* Filter Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Badge 
            variant={filterType === 'all' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setFilterType('all')}
          >
            All Heirlooms
          </Badge>
          <Badge 
            variant={filterType === 'legacy' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setFilterType('legacy')}
          >
            Legacy Letters
          </Badge>
          <Badge 
            variant={filterType === 'family' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setFilterType('family')}
          >
            Family Memories
          </Badge>
          <Badge 
            variant={filterType === 'future-self' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setFilterType('future-self')}
          >
            Future Self
          </Badge>
        </div>

        {/* Capsules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCapsules.map((capsule) => (
            <Card key={capsule.id} className="card-memory group hover-lift">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getTypeGradient(capsule.type)} rounded-xl flex items-center justify-center`}>
                  {capsule.status === 'locked' ? (
                    <Lock className="w-6 h-6 text-white" />
                  ) : (
                    <Calendar className="w-6 h-6 text-white" />
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2 line-clamp-1">{capsule.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">For: {capsule.recipient}</p>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {capsule.preview}
                </p>
              </div>

              {/* Status & Metadata */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(capsule.status)}>
                    {capsule.status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                    {capsule.status === 'scheduled' && <Calendar className="w-3 h-3 mr-1" />}
                    {capsule.status === 'delivered' && <Unlock className="w-3 h-3 mr-1" />}
                    {capsule.status.charAt(0).toUpperCase() + capsule.status.slice(1)}
                  </Badge>
                  
                  {capsule.isEncrypted && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Lock className="w-3 h-3 mr-1" />
                      Encrypted
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{capsule.wordCount} words</span>
                  {capsule.deliveryDate && (
                    <span>
                      {capsule.status === 'delivered' ? 'Delivered' : 'Delivers'}{' '}
                      {capsule.deliveryDate.toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Progress bar for time-locked capsules */}
                {capsule.status === 'locked' && capsule.deliveryDate && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Time Lock Progress</span>
                      <span>
                        {Math.round(
                          ((Date.now() - capsule.createdAt.getTime()) / 
                           (capsule.deliveryDate.getTime() - capsule.createdAt.getTime())) * 100
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div 
                        className="bg-gradient-to-r from-accent to-accent-glow h-1 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round(
                            ((Date.now() - capsule.createdAt.getTime()) / 
                             (capsule.deliveryDate.getTime() - capsule.createdAt.getTime())) * 100
                          ))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button 
                variant="outline" 
                className="w-full mt-4 btn-gentle opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {capsule.status === 'draft' ? 'Continue Editing' : 'View Details'}
              </Button>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredCapsules.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl flex items-center justify-center">
              <Calendar className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">No heirlooms found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'Try adjusting your search terms' : 'Create your first living heirloom to get started'}
            </p>
            <Button className="btn-hero">
              Create Your First Heirloom
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapsuleLibrary;