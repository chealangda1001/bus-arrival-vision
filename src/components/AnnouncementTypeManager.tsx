import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAnnouncementTypes, type AnnouncementType } from "@/hooks/useAnnouncementTypes";
import { Plus, Save, Trash2, Mic, Languages, Volume2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AnnouncementTypeManagerProps {
  operatorId: string;
}

export default function AnnouncementTypeManager({ operatorId }: AnnouncementTypeManagerProps) {
  const { types, loading, createType, updateType, deleteType } = useAnnouncementTypes(operatorId);
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({
    type_key: "",
    type_name: "",
    description: "",
  });

  // Draft state for editing scripts per type
  const [draftScripts, setDraftScripts] = useState<Record<string, { english: string; khmer: string; chinese: string }>>({});

  // Initialize draft scripts when types load
  useEffect(() => {
    const drafts: Record<string, { english: string; khmer: string; chinese: string }> = {};
    types.forEach(t => {
      drafts[t.id] = { ...t.announcement_scripts };
    });
    setDraftScripts(drafts);
  }, [types]);

  const handleCreateType = async () => {
    if (!newTypeForm.type_key || !newTypeForm.type_name) {
      toast({ title: "Error", description: "Type key and name are required.", variant: "destructive" });
      return;
    }
    await createType({
      type_key: newTypeForm.type_key.toLowerCase().replace(/\s+/g, '_'),
      type_name: newTypeForm.type_name,
      description: newTypeForm.description,
    });
    setNewTypeForm({ type_key: "", type_name: "", description: "" });
    setCreateDialogOpen(false);
  };

  const handleSaveScript = (typeId: string, language: 'english' | 'khmer' | 'chinese') => {
    const draft = draftScripts[typeId];
    if (!draft) return;
    const type = types.find(t => t.id === typeId);
    if (!type) return;

    updateType(typeId, {
      announcement_scripts: {
        ...type.announcement_scripts,
        [language]: draft[language],
      }
    });
  };

  const handleDraftChange = (typeId: string, language: 'english' | 'khmer' | 'chinese', value: string) => {
    setDraftScripts(prev => ({
      ...prev,
      [typeId]: {
        ...(prev[typeId] || { english: '', khmer: '', chinese: '' }),
        [language]: value,
      }
    }));
  };

  const hasUnsavedChanges = (typeId: string, language: 'english' | 'khmer' | 'chinese') => {
    const draft = draftScripts[typeId];
    const type = types.find(t => t.id === typeId);
    if (!draft || !type) return false;
    return draft[language] !== type.announcement_scripts[language];
  };

  const handleVoiceSettingUpdate = (typeId: string, language: 'khmer' | 'english' | 'chinese', field: string, value: any) => {
    const type = types.find(t => t.id === typeId);
    if (!type) return;

    updateType(typeId, {
      voice_settings: {
        ...type.voice_settings,
        [language]: {
          ...type.voice_settings[language],
          [field]: value,
        }
      }
    });
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading announcement types...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Announcement Types
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Announcement Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type Name</Label>
                  <Input
                    value={newTypeForm.type_name}
                    onChange={(e) => setNewTypeForm(prev => ({
                      ...prev,
                      type_name: e.target.value,
                      type_key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    }))}
                    placeholder="e.g., Arrival Announcement"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type Key (auto-generated)</Label>
                  <Input
                    value={newTypeForm.type_key}
                    onChange={(e) => setNewTypeForm(prev => ({ ...prev, type_key: e.target.value }))}
                    placeholder="e.g., arrival"
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier, no spaces</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTypeForm.description}
                    onChange={(e) => setNewTypeForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of when this type is used"
                    rows={2}
                  />
                </div>
                <Button onClick={handleCreateType} className="w-full">Create Announcement Type</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {types.map((type) => (
            <AccordionItem key={type.id} value={type.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{type.type_name}</span>
                  {type.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  {!type.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-mono">{type.type_key}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Type Name</Label>
                    <Input
                      value={type.type_name}
                      onChange={(e) => updateType(type.id, { type_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat Count</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={type.repeat_count}
                      onChange={(e) => updateType(type.id, { repeat_count: parseInt(e.target.value) || 3 })}
                      className="w-24"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Break Duration (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={type.default_break_duration ?? ''}
                      onChange={(e) => updateType(type.id, { default_break_duration: e.target.value ? parseInt(e.target.value) : null } as any)}
                      placeholder="e.g., 15"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <div className="flex items-center gap-2">
                      <Label>Active</Label>
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={(checked) => updateType(type.id, { is_active: checked })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Driver Playable</Label>
                      <Switch
                        checked={type.driver_playable}
                        onCheckedChange={(checked) => updateType(type.id, { driver_playable: checked } as any)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Voice Configuration */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice Configuration
                  </h4>
                  <Tabs defaultValue="khmer" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="khmer">🇰🇭 Khmer</TabsTrigger>
                      <TabsTrigger value="english">🇺🇸 English</TabsTrigger>
                      <TabsTrigger value="chinese">🇨🇳 Chinese</TabsTrigger>
                    </TabsList>
                    {(['khmer', 'english', 'chinese'] as const).map((lang) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-accent/5 rounded-lg border">
                          <div className="space-y-2">
                            <Label>Voice Model</Label>
                            <Select
                              value={type.voice_settings?.[lang]?.voice_model || 'Zephyr'}
                              onValueChange={(v) => handleVoiceSettingUpdate(type.id, lang, 'voice_model', v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Zephyr">Zephyr (Female)</SelectItem>
                                <SelectItem value="Kore">Kore (Male)</SelectItem>
                                <SelectItem value="Luna">Luna (Female)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Voice Gender</Label>
                            <Select
                              value={type.voice_settings?.[lang]?.voice || 'female'}
                              onValueChange={(v) => handleVoiceSettingUpdate(type.id, lang, 'voice', v)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Speed: {type.voice_settings?.[lang]?.speed ?? 1.0}</Label>
                            <Slider
                              min={0.5} max={2.0} step={0.1}
                              value={[type.voice_settings?.[lang]?.speed ?? 1.0]}
                              onValueChange={(v) => handleVoiceSettingUpdate(type.id, lang, 'speed', v[0])}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pitch: {type.voice_settings?.[lang]?.pitch ?? 0}</Label>
                            <Slider
                              min={-20} max={20} step={1}
                              value={[type.voice_settings?.[lang]?.pitch ?? 0]}
                              onValueChange={(v) => handleVoiceSettingUpdate(type.id, lang, 'pitch', v[0])}
                            />
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <Separator />

                {/* Scripts */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Announcement Scripts
                  </h4>
                  <Tabs defaultValue="english">
                    <TabsList>
                      <TabsTrigger value="english">🇺🇸 English</TabsTrigger>
                      <TabsTrigger value="khmer">🇰🇭 ខ្មែរ</TabsTrigger>
                      <TabsTrigger value="chinese">🇨🇳 中文</TabsTrigger>
                    </TabsList>
                    {(['english', 'khmer', 'chinese'] as const).map((lang) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="space-y-3">
                          <Textarea
                            value={draftScripts[type.id]?.[lang] || ''}
                            onChange={(e) => handleDraftChange(type.id, lang, e.target.value)}
                            rows={5}
                            placeholder={`Enter ${lang} script...`}
                          />
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${hasUnsavedChanges(type.id, lang) ? 'text-orange-600' : 'text-green-600'}`}>
                              {hasUnsavedChanges(type.id, lang) ? 'Unsaved changes' : 'Saved'}
                            </span>
                            <Button
                              onClick={() => handleSaveScript(type.id, lang)}
                              disabled={!hasUnsavedChanges(type.id, lang)}
                              size="sm"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Script
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Available Placeholders */}
                <div className="p-3 bg-muted/5 rounded-lg border">
                  <h5 className="font-medium mb-2 text-sm">Available Placeholders</h5>
                  <div className="flex flex-wrap gap-1">
                    {type.type_key === 'break_stop' ? (
                      <>
                        <Badge variant="secondary" className="text-xs">{"{break_duration}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{operator_name}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{destination}"}</Badge>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">{"{destination}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{leaving_from}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{fleet_type}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{departure_time}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{fleet_plate_number}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{trip_duration}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{break_duration}"}</Badge>
                        <Badge variant="secondary" className="text-xs">{"{operator_name}"}</Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete Button (non-default only) */}
                {!type.is_default && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${type.type_name}"? This cannot be undone.`)) {
                          deleteType(type.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Type
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {types.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No announcement types configured yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
