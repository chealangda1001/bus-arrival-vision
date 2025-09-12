import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useOperatorSettings, type OperatorSettings } from "@/hooks/useOperatorSettings";
import { Play, Trash2, Settings, Volume2 } from "lucide-react";
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

  const handleTestAnnouncement = () => {
    setTestDeparture(true);
    setTimeout(() => setTestDeparture(false), 100);
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
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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

          {/* Script Configuration */}
          <div>
            <Label className="text-base font-semibold">Announcement Scripts</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Customize announcement templates. Use placeholders: {"{fleet_type}"}, {"{destination}"}, {"{time}"}, {"{plate}"}
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
                    rows={3}
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
                    rows={3}
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
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Available Placeholders */}
          <div className="p-4 bg-muted/5 rounded-lg border">
            <h4 className="font-semibold mb-2">Available Placeholders</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{"{fleet_type}"}</Badge>
              <Badge variant="secondary">{"{destination}"}</Badge>
              <Badge variant="secondary">{"{time}"}</Badge>
              <Badge variant="secondary">{"{plate}"}</Badge>
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