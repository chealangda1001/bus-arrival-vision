import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Download, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  parseScript, 
  formatAnnouncementScript, 
  validateScript,
  VOICE_CONFIGS,
  DEFAULT_STYLE_INSTRUCTIONS
} from '@/utils/scriptParser';

const GeminiTTSDemo: React.FC = () => {
  const [script, setScript] = useState(`[Voice: Zephyr] សូមអញ្ជើញអ្នកដំណើរទៅកាន់ភ្នំពេញ ត្រៀមឡើងរថយន្ត
[Voice: Kore] Attention please. Passengers riding to Phnom Penh, please proceed to the bus.`);
  
  const [speechRate, setSpeechRate] = useState([0.9]);
  const [pitchAdjustment, setPitchAdjustment] = useState([0]);
  const [temperature, setTemperature] = useState([0.7]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<any>(null);
  
  const { toast } = useToast();

  const generateMultiSpeakerAudio = async () => {
    try {
      setIsGenerating(true);
      setAudioUrl(null);

      // Validate the script
      const validation = validateScript(script);
      if (!validation.isValid) {
        toast({
          title: "Script Validation Error",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // Parse the script to show what will be generated
      const segments = parseScript(script);
      console.log('Parsed segments:', segments);

      const { data, error } = await supabase.functions.invoke('gemini-multispeaker-tts', {
        body: {
          script,
          operatorId: 'demo-user',
          speechRate: speechRate[0],
          pitchAdjustment: pitchAdjustment[0],
          temperature: temperature[0],
          styleInstructions: DEFAULT_STYLE_INSTRUCTIONS
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setLastGenerated(data);

        toast({
          title: "Multi-Speaker Audio Generated",
          description: `Created ${data.segments} segments using ${data.voices?.join(' + ')} voices`,
        });
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'gemini-multispeaker-announcement.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Gemini Multi-Speaker TTS Demo</h2>
        </div>
        <p className="text-text-display/70 mb-6">
          Test Google Gemini 2.5 Pro's multi-speaker TTS with Zephyr (Khmer female) and Kore (English male) voices
        </p>

        {/* Voice Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <div className="text-center">
              <Badge className="bg-purple-100 text-purple-700 mb-2">Zephyr Voice</Badge>
              <div className="text-sm text-text-display/70">
                Female • Khmer • Warm Tone<br />
                Pitch: +{VOICE_CONFIGS.Zephyr.pitchAdjustment} • Rate: {VOICE_CONFIGS.Zephyr.speechRate}x
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <div className="text-center">
              <Badge className="bg-blue-100 text-blue-700 mb-2">Kore Voice</Badge>
              <div className="text-sm text-text-display/70">
                Male • English • Firm Tone<br />
                Pitch: {VOICE_CONFIGS.Kore.pitchAdjustment} • Rate: {VOICE_CONFIGS.Kore.speechRate}x
              </div>
            </div>
          </div>
        </div>

        {/* Script Input */}
        <div className="space-y-4 mb-6">
          <Label htmlFor="script-input">Multi-Speaker Script</Label>
          <Textarea
            id="script-input"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="[Voice: Zephyr] Your Khmer text here...
[Voice: Kore] Your English text here..."
            rows={4}
            className="font-mono"
          />
          <div className="text-xs text-text-display/60">
            Use [Voice: Zephyr] for Khmer announcements and [Voice: Kore] for English announcements
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <Label className="text-sm font-medium">
              Speech Rate: {speechRate[0]}x
            </Label>
            <Slider
              value={speechRate}
              onValueChange={setSpeechRate}
              min={0.5}
              max={2.0}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">
              Pitch Adjustment: {pitchAdjustment[0] > 0 ? '+' : ''}{pitchAdjustment[0]}
            </Label>
            <Slider
              value={pitchAdjustment}
              onValueChange={setPitchAdjustment}
              min={-2}
              max={2}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">
              Temperature: {temperature[0]}
            </Label>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              min={0.1}
              max={1.0}
              step={0.1}
              className="mt-2"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex gap-4 justify-center mb-6">
          <Button 
            onClick={generateMultiSpeakerAudio}
            disabled={isGenerating || !script.trim()}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating with Gemini...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Multi-Speaker Audio
              </>
            )}
          </Button>

          {audioUrl && (
            <Button
              onClick={downloadAudio}
              variant="outline"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Download MP3
            </Button>
          )}
        </div>

        {/* Audio Playback */}
        {audioUrl && (
          <Card className="p-4 bg-accent/10">
            <h4 className="font-medium mb-4 flex items-center">
              <Volume2 className="mr-2 h-4 w-4" />
              Generated Multi-Speaker Audio
            </h4>
            <audio controls className="w-full mb-4" src={audioUrl}>
              Your browser does not support audio playback.
            </audio>
            
            {lastGenerated && (
              <div className="text-sm text-text-display/70 space-y-1">
                <div>Segments: {lastGenerated.segments}</div>
                <div>Voices Used: {lastGenerated.voices?.join(', ')}</div>
                <div>Powered by Google Gemini 2.5 Pro TTS</div>
              </div>
            )}
          </Card>
        )}

        {/* Sample Scripts */}
        <Card className="p-4 mt-6 bg-background/50">
          <h4 className="font-medium mb-3">Sample Scripts</h4>
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-left justify-start h-auto p-2"
              onClick={() => setScript(`[Voice: Zephyr] សូមអញ្ជើញអ្នកដំណើរទៅកាន់សៀមរាប ត្រៀមឡើងរថយន្ត លេខ ០១
[Voice: Kore] Attention passengers. Bus to Siem Reap, number 01, is now boarding.`)}
            >
              <div className="text-xs font-mono">
                [Voice: Zephyr] សូមអញ្ជើញអ្នកដំណើរទៅកាន់សៀមរាប...<br/>
                [Voice: Kore] Attention passengers. Bus to Siem Reap...
              </div>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-left justify-start h-auto p-2"
              onClick={() => setScript(`[Voice: Zephyr] រថយន្តទៅកែប នឹងចេញនៅម៉ោង ២:៣០ រសៀល
[Voice: Kore] The bus to Kep will depart at 2:30 PM.`)}
            >
              <div className="text-xs font-mono">
                [Voice: Zephyr] រថយន្តទៅកែប នឹងចេញនៅម៉ោង ២:៣០...<br/>
                [Voice: Kore] The bus to Kep will depart at 2:30 PM.
              </div>
            </Button>
          </div>
        </Card>
      </Card>
    </div>
  );
};

export default GeminiTTSDemo;