import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share2, RefreshCw, Wand2, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GenerationPage = () => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [toneAdjustment, setToneAdjustment] = useState([7]);
  const [lengthPreference, setLengthPreference] = useState('medium');

  // Simulated generated versions
  const generatedVersions = [
    {
      title: "Heartfelt & Personal",
      tone: "warm",
      content: `My dearest one,

As I write this, my heart is full of all the memories we've shared and all the dreams I hold for your future. I want you to know that the moment you smiled at me during our quiet Sunday morning together remains one of my most treasured memories. It was in that simple, perfect moment that I realized how much joy you bring to this world.

If I could share one piece of wisdom with you, it would be this: Trust your heart, but don't be afraid to let your mind guide you too. Life will present you with countless choices, and sometimes the path forward won't be clear. But remember that every experience, even the difficult ones, shapes you into the remarkable person you're becoming.

What I hope you'll always remember about me is not just the words I've spoken, but the love that lives behind them. I want you to feel that love like a warm embrace, even when I'm not there to give you one in person.

For your future, I dream of you finding work that feeds your soul, relationships that nurture your spirit, and adventures that expand your world. But most of all, I hope you'll always remember how deeply you are loved.

With all my love,
Your devoted [Name]`
    },
    {
      title: "Wise & Reflective", 
      tone: "thoughtful",
      content: `Dear Future You,

Time has a way of teaching us what truly matters, and as I reflect on the lessons life has gifted me, I find myself wanting to share these discoveries with you.

The moment that still brings warmth to my heart happened on an ordinary Tuesday when we sat together in comfortable silence, watching the world wake up. In that stillness, I understood that the most profound connections aren't always built from grand gestures, but from the accumulation of quiet, authentic moments shared between souls who truly see each other.

The wisdom I've gathered over the years whispers this truth: Courage isn't the absence of fear—it's the decision that something else is more important than fear. Whether you're facing a crossroads in your career, relationships, or personal growth, remember that the path of authenticity, though sometimes more challenging, always leads to a life you can be proud of.

I hope that when you think of me, you'll remember someone who believed in your infinite potential and who saw in you a light that could illuminate not just your own path, but the paths of others fortunate enough to know you.

The future I envision for you is rich with purpose, deep connections, and the kind of joy that comes from living in alignment with your truest self. Trust the journey, even when the destination isn't yet clear.

With profound love and endless faith in you,
[Your Name]`
    },
    {
      title: "Poetic & Inspirational",
      tone: "inspiring", 
      content: `Beloved Soul,

Words feel both too small and perfectly vast as I try to capture what lives in my heart for you. Like morning light spilling through curtains, some moments illuminate everything—and that Sunday when your laughter filled the kitchen while we made pancakes together is painted in gold in my memory. In that ordinary magic, I glimpsed the extraordinary spirit you carry.

If wisdom could be distilled into starlight, I would offer you this constellation of truth: You are both the question and the answer you've been seeking. Life will ask you to choose between safety and growth, between fitting in and standing out, between settling and soaring. Choose the path that makes your soul sing, even if your voice shakes while you're singing.

When the world grows quiet and you wonder what legacy I hoped to leave in your heart, remember this: You are loved beyond measure, capable beyond imagination, and destined for a kind of joy that transforms not just your life, but every life you touch.

I see your tomorrow painted in shades of courage and kindness, adventure and peace, success and service. May you chase dreams that are worthy of your magnificent spirit, and may you always know that somewhere in the threads of time, someone believes in every beautiful thing you're becoming.

Until we meet again in whatever form love takes,
Forever yours,
[Your Name]`
    }
  ];

  const currentVersion = generatedVersions[selectedVersion];

  useEffect(() => {
    // Simulate generation process
    const timer = setTimeout(() => {
      setIsGenerating(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6 flex items-center justify-center">
        <Card className="card-sacred max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
              <Wand2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-serif font-medium mb-4">Crafting Your Message</h2>
            <p className="text-emotion mb-8">
              Our AI is thoughtfully weaving your words into something beautiful. 
              This process is guided by emotional intelligence and deep respect for your story.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="shimmer h-4 rounded"></div>
            <div className="shimmer h-4 rounded w-5/6"></div>
            <div className="shimmer h-4 rounded w-4/6"></div>
            <div className="shimmer h-4 rounded w-5/6"></div>
          </div>

          <div className="mt-12 text-sm text-muted-foreground">
            Creating emotional resonance... This may take a moment.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" className="btn-gentle">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interview
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" className="btn-gentle">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button className="btn-hero">
              <Download className="w-4 h-4 mr-2" />
              Save Capsule
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Version Selector */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-medium mb-4">Choose Your Voice</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {generatedVersions.map((version, index) => (
                  <Card 
                    key={index}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedVersion === index 
                        ? 'card-sacred border-primary glow-primary' 
                        : 'card-memory hover-lift'
                    }`}
                    onClick={() => setSelectedVersion(index)}
                  >
                    <h3 className="font-medium mb-2">{version.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {version.tone === 'warm' && 'Personal and intimate tone'}
                      {version.tone === 'thoughtful' && 'Reflective and wise approach'}
                      {version.tone === 'inspiring' && 'Poetic and uplifting language'}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Generated Content */}
            <Card className="card-preview">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-line font-light leading-relaxed text-lg">
                  {currentVersion.content}
                </div>
              </div>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="space-y-6">
            <Card className="card-memory">
              <h3 className="text-xl font-medium mb-6">Customize Your Message</h3>
              
              <div className="space-y-8">
                {/* Tone Adjustment */}
                <div>
                  <label className="block text-sm font-medium mb-3">Emotional Tone</label>
                  <div className="space-y-2">
                    <Slider
                      value={toneAdjustment}
                      onValueChange={setToneAdjustment}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Gentle</span>
                      <span>Passionate</span>
                    </div>
                  </div>
                </div>

                {/* Length Preference */}
                <div>
                  <label className="block text-sm font-medium mb-3">Message Length</label>
                  <Select value={lengthPreference} onValueChange={setLengthPreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Concise & Powerful</SelectItem>
                      <SelectItem value="medium">Thoughtful & Complete</SelectItem>
                      <SelectItem value="long">Detailed & Immersive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Regenerate Button */}
                <Button 
                  variant="outline" 
                  className="w-full btn-gentle"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate with Settings
                </Button>
              </div>
            </Card>

            {/* Delivery Options */}
            <Card className="card-memory">
              <h3 className="text-xl font-medium mb-6">Delivery Options</h3>
              
              <div className="space-y-4">
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Clock className="w-4 h-4 mr-3" />
                  Schedule for Future
                </Button>
                
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Lock className="w-4 h-4 mr-3" />
                  Time Lock Until Date
                </Button>
                
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Share2 className="w-4 h-4 mr-3" />
                  Share Now
                </Button>
              </div>
            </Card>

            {/* Preview Stats */}
            <Card className="card-memory">
              <h3 className="text-lg font-medium mb-4">Message Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Word Count</span>
                  <span>{currentVersion.content.split(' ').length} words</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reading Time</span>
                  <span>~{Math.ceil(currentVersion.content.split(' ').length / 200)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emotional Tone</span>
                  <span className="capitalize">{currentVersion.tone}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationPage;