import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Download, RefreshCw, Settings, TestTube2, Trophy, Volume2 } from "lucide-react";

interface VoicePreferences {
  id: string;
  preferred_voice: string;
  auto_selected_voice?: string;
  is_manual_override: boolean;
  voice_candidates: any; // JSON from database
  tts_settings: any; // JSON from database
  last_optimization_date?: string;
}

interface VoiceEvaluation {
  voice: string;
  finalScore: number;
  evaluation: {
    excellent: boolean;
    good: boolean;
    fair: boolean;
    poor: boolean;
  };
}

const DEFAULT_VOICES = ['nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy', 'ash', 'sage', 'coral'];
const SAMPLE_KHMER_TEXT = 'សូមអ្នកដំណើរ សេវាកម្ម VIP Van ទៅ Kep នឹងចេញនៅម៉ោង ០៧:៤៥។ លេខផ្ទាំងឡាន PP-1234។ សូមទៅកាន់តំបន់ឡើងឡាន។';

const KhmerTTSLab = () => {
  const { toast } = useToast();
  const [khmerText, setKhmerText] = useState(SAMPLE_KHMER_TEXT);
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [rate, setRate] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<VoicePreferences | null>(null);
  const [testResults, setTestResults] = useState<VoiceEvaluation[]>([]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_preferences')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
        setSelectedVoice(data.is_manual_override ? data.preferred_voice : (data.auto_selected_voice || data.preferred_voice));
        const settings = (typeof data.tts_settings === 'object' && data.tts_settings && !Array.isArray(data.tts_settings)) 
          ? data.tts_settings as { rate?: number; pitch?: number }
          : {};
        setRate([(settings as any)?.rate || 1.0]);
        setPitch([(settings as any)?.pitch || 1.0]);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async (updates: Partial<VoicePreferences>) => {
    try {
      if (!preferences) {
        // Create new preferences
        const { data, error } = await supabase
          .from('voice_preferences')
          .insert({
            preferred_voice: selectedVoice,
            is_manual_override: true,
            voice_candidates: DEFAULT_VOICES,
            tts_settings: { rate: rate[0], pitch: pitch[0] },
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setPreferences(data);
      } else {
        // Update existing preferences
        const { data, error } = await supabase
          .from('voice_preferences')
          .update({
            preferred_voice: selectedVoice,
            tts_settings: { rate: rate[0], pitch: pitch[0] },
            ...updates
          })
          .eq('id', preferences.id)
          .select()
          .single();

        if (error) throw error;
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const generateAudio = async () => {
    if (!khmerText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some Khmer text",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('khmer-tts-synthesizer', {
        body: {
          text: khmerText,
          voice: selectedVoice,
          rate: rate[0],
          pitch: pitch[0],
          operatorId: null // For super admin, no specific operator
        }
      });

      console.log('TTS Response:', response);

      // Check for errors more comprehensively
      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(response.error.message || 'Function execution failed');
      }

      // Validate response data structure
      if (!response.data) {
        console.error('No data in response:', response);
        throw new Error('No data returned from TTS function');
      }

      if (!response.data.audioContent) {
        console.error('No audioContent in response data:', response.data);
        throw new Error('No audio content returned from TTS function');
      }

      // Validate base64 string
      const audioContent = response.data.audioContent;
      if (typeof audioContent !== 'string' || audioContent.length === 0) {
        console.error('Invalid audioContent:', audioContent);
        throw new Error('Invalid audio content format');
      }

      console.log('Audio content length:', audioContent.length);

      // Create audio blob from base64
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], 
          { type: 'audio/mp3' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        toast({
          title: "Success",
          description: "Audio generated successfully",
        });
      } catch (blobError) {
        console.error('Error creating audio blob:', blobError);
        throw new Error('Failed to create audio from response data');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate audio",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const runVoiceOptimization = async () => {
    setIsOptimizing(true);
    try {
      const response = await supabase.functions.invoke('khmer-voice-optimizer', {
        body: {
          operatorId: null,
          forceReoptimize: true
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      toast({
        title: "Optimization Complete",
        description: `Best voice found: ${result.bestVoice} (score: ${result.bestScore.toFixed(3)})`,
      });

      // Reload preferences to get the updated auto-selected voice
      await loadPreferences();
    } catch (error) {
      console.error('Error optimizing voices:', error);
      toast({
        title: "Error",
        description: "Voice optimization failed",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const runABTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      const testVoices = ['nova', 'shimmer', 'echo', 'alloy'];
      const results: VoiceEvaluation[] = [];

      for (const voice of testVoices) {
        const response = await supabase.functions.invoke('khmer-voice-evaluator', {
          body: {
            text: khmerText,
            voice: voice,
            operatorId: null
          }
        });

        if (response.error) {
          console.error(`Error testing ${voice}:`, response.error);
          continue;
        }

        results.push(response.data);
      }

      setTestResults(results.sort((a, b) => b.finalScore - a.finalScore));
      
      toast({
        title: "A/B Test Complete",
        description: `Tested ${results.length} voices`,
      });
    } catch (error) {
      console.error('Error running A/B test:', error);
      toast({
        title: "Error",
        description: "A/B test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `khmer-tts-${selectedVoice}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    savePreferences({ 
      preferred_voice: voice, 
      is_manual_override: true 
    });
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.9) return "default"; // Green
    if (score >= 0.7) return "secondary"; // Blue
    if (score >= 0.5) return "outline"; // Yellow
    return "destructive"; // Red
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-text-display">Khmer TTS Laboratory</h3>
        <div className="flex gap-2">
          <Button
            onClick={runVoiceOptimization}
            disabled={isOptimizing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Auto-Optimize'}
          </Button>
          <Button
            onClick={runABTest}
            disabled={isTesting}
            variant="outline"
            size="sm"
          >
            <TestTube2 className="w-4 h-4 mr-2" />
            {isTesting ? 'Testing...' : 'A/B Test'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main TTS Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Text-to-Speech Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Input */}
            <div>
              <Label htmlFor="khmer-text">Khmer Text (UTF-8)</Label>
              <Textarea
                id="khmer-text"
                value={khmerText}
                onChange={(e) => setKhmerText(e.target.value)}
                placeholder="Enter Khmer text here..."
                className="min-h-[100px] text-right"
                dir="rtl"
              />
            </div>

            {/* Voice Selection */}
            <div>
              <Label htmlFor="voice-select">Voice Selection</Label>
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_VOICES.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                      {preferences?.auto_selected_voice === voice && (
                        <Trophy className="w-4 h-4 ml-2 inline text-yellow-500" />
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preferences?.auto_selected_voice && (
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-recommended: {preferences.auto_selected_voice}
                  {preferences.last_optimization_date && (
                    <span className="ml-2">
                      (optimized {new Date(preferences.last_optimization_date).toLocaleDateString()})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Rate Control */}
            <div>
              <Label>Speech Rate: {rate[0].toFixed(1)}x</Label>
              <Slider
                value={rate}
                onValueChange={setRate}
                min={0.5}
                max={2.0}
                step={0.1}
                className="mt-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={generateAudio}
                disabled={isGenerating}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Audio'}
              </Button>
              {audioUrl && (
                <Button
                  onClick={downloadAudio}
                  variant="outline"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Audio Player */}
            {audioUrl && (
              <div className="mt-4">
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mp3" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Quality Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Voice Quality Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Best Voice */}
            {preferences?.auto_selected_voice && (
              <div className="p-4 bg-accent/10 rounded-lg">
                <h4 className="font-medium mb-2">Current Best Voice</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{preferences.auto_selected_voice}</span>
                  <Badge variant="default">
                    <Trophy className="w-3 h-3 mr-1" />
                    Optimized
                  </Badge>
                </div>
              </div>
            )}

            {/* A/B Test Results */}
            {testResults.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">A/B Test Results</h4>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={result.voice} className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">#{index + 1}</span>
                        <span>{result.voice}</span>
                      </div>
                      <Badge variant={getScoreBadgeVariant(result.finalScore)}>
                        {(result.finalScore * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Candidates */}
            <div>
              <h4 className="font-medium mb-2">Available Voices</h4>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_VOICES.map((voice) => (
                  <Badge key={voice} variant="outline">
                    {voice}
                  </Badge>
                ))}
              </div>
            </div>

            {/* TTS Settings */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Current Settings</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Rate: {rate[0].toFixed(1)}x</div>
                <div>Pitch: {pitch[0].toFixed(1)}</div>
                <div>Manual Override: {preferences?.is_manual_override ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KhmerTTSLab;