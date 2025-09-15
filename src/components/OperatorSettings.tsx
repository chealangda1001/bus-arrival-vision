import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useOperatorSettings, type OperatorSettings, type VoiceSettings } from "@/hooks/useOperatorSettings";
import { Play, Trash2, Settings, Volume2, Mic, Brain, Languages } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AnnouncementSystem from "./AnnouncementSystem";

interface OperatorSettingsProps {
  operatorId: string;
}

export default function OperatorSettings({ operatorId }: OperatorSettingsProps) {
  const { settings, loading, updateSettings, clearCache } = useOperatorSettings(operatorId);
  const { toast } = useToast();
  const [testDeparture, setTestDeparture] = useState(false);

  const handleRepeatCountChange = (count: number) => {
    if (count >= 1 && count <= 10) {
      updateSettings({ announcement_repeat_count: count });
    }
  };

  const handleScriptUpdate = (language: 'english' | 'khmer' | 'chinese', script: string) => {
    if (!settings) return;
    
    const updatedScripts = {
      ...settings.announcement_scripts,
      [language]: script
    };
    
    updateSettings({ announcement_scripts: updatedScripts });
  };

  const handleVoiceSettingUpdate = (language: 'khmer' | 'english' | 'chinese', field: keyof VoiceSettings, value: any) => {
    if (!settings) return;
    
    const updatedVoiceSettings = {
      ...settings.voice_settings,
      [language]: {
        ...settings.voice_settings[language],
        [field]: value
      }
    };
    
    updateSettings({ voice_settings: updatedVoiceSettings });
  };

  const handleStyleInstructionsUpdate = (instructions: string) => {
    updateSettings({ style_instructions: instructions });
  };

  const handleTemperatureChange = (temperature: number[]) => {
    updateSettings({ temperature: temperature[0] });
  };

  const handleTestAnnouncement = () => {
    setTestDeparture(true);
  };

  const handleClearCache = () => {
    clearCache();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Settings...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load operator settings</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const testDepartureData = {
    id: "test",
    branch_id: "test",
    destination: "Phnom Penh",
    departure_time: "14:30",
    plate_number: "PP-1234",
    fleet_type: "Bus" as const,
    status: "boarding" as const,
    is_visible: true,
    trip_duration: "3",
    break_duration: "15",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Voice Announcement Settings
          </CardTitle>
          <CardDescription>
            Configure automated voice announcements for departure boards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Basic Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operator-name">Operator Name</Label>
                  <Input
                    id="operator-name"
                    value={settings.operator_name}
                    onChange={(e) => updateSettings({ operator_name: e.target.value })}
                    placeholder="Enter operator name"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-enabled">Voice Announcements</Label>
                  <Switch
                    id="voice-enabled"
                    checked={settings.voice_enabled}
                    onCheckedChange={(checked) => updateSettings({ voice_enabled: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-enabled">Auto-play on Boarding</Label>
                  <Switch
                    id="auto-enabled"
                    checked={settings.auto_announcement_enabled}
                    onCheckedChange={(checked) => updateSettings({ auto_announcement_enabled: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="repeat-count">Repeat Count</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="repeat-count"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.announcement_repeat_count}
                      onChange={(e) => handleRepeatCountChange(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">times (1-10)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Quick Actions
                  </h4>
                  <div className="space-y-2">
                    <Button
                      onClick={handleTestAnnouncement}
                      variant="outline"
                      className="w-full"
                      disabled={!settings.voice_enabled}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Test Announcement
                    </Button>
                    <Button
                      onClick={handleClearCache}
                      variant="outline"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Audio Cache
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* AI & TTS Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Generation Settings
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="style-instructions">Style Instructions</Label>
                <Textarea
                  id="style-instructions"
                  value={settings.style_instructions}
                  onChange={(e) => handleStyleInstructionsUpdate(e.target.value)}
                  placeholder="Enter AI generation style instructions..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  Instructions for AI to generate appropriate voice announcements with proper style and tone
                </p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="temperature">AI Creativity (Temperature): {settings.temperature}</Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[settings.temperature]}
                  onValueChange={handleTemperatureChange}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>More Consistent (0.0)</span>
                  <span>More Creative (1.0)</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Voice Configuration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Voice Configuration
            </h3>
            
            <Tabs defaultValue="khmer" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="khmer" className="flex items-center gap-2">
                  🇰🇭 Khmer
                </TabsTrigger>
                <TabsTrigger value="english" className="flex items-center gap-2">
                  🇺🇸 English  
                </TabsTrigger>
                <TabsTrigger value="chinese" className="flex items-center gap-2">
                  🇨🇳 Chinese
                </TabsTrigger>
              </TabsList>
              
              {(['khmer', 'english', 'chinese'] as const).map((language) => (
                <TabsContent key={language} value={language} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-accent/5 rounded-lg border">
                    <div className="space-y-2">
                      <Label>Voice Model</Label>
                      <Select
                        value={settings.voice_settings[language].voice_model || (language === 'khmer' ? 'Zephyr' : language === 'english' ? 'Kore' : 'Luna')}
                        onValueChange={(value: 'Zephyr' | 'Kore' | 'Luna') => 
                          handleVoiceSettingUpdate(language, 'voice_model', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Zephyr">Zephyr (Female)</SelectItem>
                          <SelectItem value="Kore">Kore (Male)</SelectItem>
                          <SelectItem value="Luna">Luna (Female)</SelectItem>
                        </SelectContent>
                      </Select>
                      {language === 'khmer' && (
                        <p className="text-xs text-muted-foreground">
                          Uses English voice as fallback
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Voice Gender</Label>
                      <Select
                        value={settings.voice_settings[language].voice}
                        onValueChange={(value: 'male' | 'female') => 
                          handleVoiceSettingUpdate(language, 'voice', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Speed: {settings.voice_settings[language].speed}</Label>
                      <Slider
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        value={[settings.voice_settings[language].speed]}
                        onValueChange={(value) => 
                          handleVoiceSettingUpdate(language, 'speed', value[0])
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Pitch: {settings.voice_settings[language].pitch}</Label>
                      <Slider
                        min={-20}
                        max={20}
                        step={1}
                        value={[settings.voice_settings[language].pitch]}
                        onValueChange={(value) => 
                          handleVoiceSettingUpdate(language, 'pitch', value[0])
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <Separator />

          {/* Script Configuration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Announcement Scripts
            </h3>
            <p className="text-sm text-muted-foreground">
              Customize announcement templates. Available placeholders: {"{destination}"}, {"{fleet_type}"}, {"{fleet_plate_number}"}, {"{trip_duration}"}, {"{break_duration}"}, {"{operator_name}"}
            </p>
            
            <Tabs defaultValue="english">
              <TabsList className="mb-4">
                <TabsTrigger value="english" className="flex items-center gap-2">
                  🇺🇸 English
                </TabsTrigger>
                <TabsTrigger value="khmer" className="flex items-center gap-2">
                  🇰🇭 ខ្មែរ
                </TabsTrigger>
                <TabsTrigger value="chinese" className="flex items-center gap-2">
                  🇨🇳 中文
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="english">
                <div className="space-y-2">
                  <Label htmlFor="script-english">English Script</Label>
                  <Textarea
                    id="script-english"
                    value={settings.announcement_scripts.english}
                    onChange={(e) => handleScriptUpdate('english', e.target.value)}
                    placeholder="Enter English announcement script..."
                    rows={5}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="khmer">
                <div className="space-y-2">
                  <Label htmlFor="script-khmer">Khmer Script</Label>
                  <Textarea
                    id="script-khmer"
                    value={settings.announcement_scripts.khmer}
                    onChange={(e) => handleScriptUpdate('khmer', e.target.value)}
                    placeholder="Enter Khmer announcement script..."
                    rows={5}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="chinese">
                <div className="space-y-2">
                  <Label htmlFor="script-chinese">Chinese Script</Label>
                  <Textarea
                    id="script-chinese"
                    value={settings.announcement_scripts.chinese}
                    onChange={(e) => handleScriptUpdate('chinese', e.target.value)}
                    placeholder="Enter Chinese announcement script..."
                    rows={5}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Available Placeholders */}
          <div className="p-4 bg-muted/5 rounded-lg border">
            <h4 className="font-semibold mb-2">Available Placeholders</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{"{destination}"}</Badge>
              <Badge variant="secondary">{"{fleet_type}"}</Badge>
              <Badge variant="secondary">{"{fleet_plate_number}"}</Badge>
              <Badge variant="secondary">{"{trip_duration}"}</Badge>
              <Badge variant="secondary">{"{break_duration}"}</Badge>
              <Badge variant="secondary">{"{operator_name}"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These will be automatically replaced with actual departure information
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Announcement */}
      {testDeparture && (
        <AnnouncementSystem
          departure={testDepartureData}
          operatorId={operatorId}
          manualTrigger={true}
          onComplete={() => {
            toast({
              title: "Test Complete",
              description: "Test announcement has finished playing",
            });
          }}
        />
      )}
    </div>
  );
}