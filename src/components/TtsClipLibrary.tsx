import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Loader2, Play, Library } from "lucide-react";

interface Clip {
  id: string;
  cache_key: string;
  language: string;
  provider: string;
  voice: string | null;
  speed: number | null;
  text: string;
  segment_kind: string;
  storage_path: string | null;
  char_count: number;
  reuse_count: number;
  last_used_at: string | null;
  created_at: string;
}

const TTS_BUCKET_URL =
  "https://eguoekxuwnerumhehheo.supabase.co/storage/v1/object/public/tts-audio/";

const LANGUAGE_LABEL: Record<string, string> = {
  khmer: "Khmer",
  english: "English",
  chinese: "Chinese",
  mixed: "Mixed",
};

export default function TtsClipLibrary() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [provider, setProvider] = useState("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tts_clips")
      .select("*")
      .order("reuse_count", { ascending: false })
      .limit(500);
    if (error) console.error("Failed to load voice clips:", error);
    setClips((data as Clip[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const languages = useMemo(
    () => Array.from(new Set(clips.map((c) => c.language))).sort(),
    [clips]
  );
  const providers = useMemo(
    () => Array.from(new Set(clips.map((c) => c.provider))).sort(),
    [clips]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clips.filter((c) => {
      if (language !== "all" && c.language !== language) return false;
      if (provider !== "all" && c.provider !== provider) return false;
      if (q && !`${c.text} ${c.voice ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clips, search, language, provider]);

  const stats = useMemo(() => {
    const totalChars = clips.reduce((sum, c) => sum + (c.char_count || 0), 0);
    const savedChars = clips.reduce(
      (sum, c) => sum + (c.char_count || 0) * (c.reuse_count || 0),
      0
    );
    return { total: clips.length, totalChars, savedChars };
  }, [clips]);

  const play = (clip: Clip) => {
    if (!clip.storage_path) return;
    audioRef.current?.pause();
    const audio = new Audio(TTS_BUCKET_URL + clip.storage_path);
    audioRef.current = audio;
    audio.play().catch((e) => console.error("Clip playback failed:", e));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" /> Voice clips
          </CardTitle>
          <CardDescription>
            Reusable audio pieces saved on your storage. Each language keeps its own
            recording, so a Chinese announcement never plays a Khmer clip.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Saved clips</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Characters recorded</p>
            <p className="text-xl font-semibold">{stats.totalChars.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Characters saved by reuse</p>
            <p className="text-xl font-semibold text-emerald-600">
              {stats.savedChars.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search wording or voice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {LANGUAGE_LABEL[l] || l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Wording</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Voice</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Reused</TableHead>
                <TableHead className="text-right">Chars</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No clips saved yet.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((clip) => (
                <TableRow key={clip.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!clip.storage_path}
                      onClick={() => play(clip)}
                      aria-label="Play clip"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate" title={clip.text}>
                    {clip.text}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {LANGUAGE_LABEL[clip.language] || clip.language}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {clip.voice || "—"}
                    {clip.speed && Number(clip.speed) !== 1 ? ` · ${clip.speed}x` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {clip.segment_kind === "var" ? "Changing value" : "Fixed wording"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{clip.reuse_count}</TableCell>
                  <TableCell className="text-right">{clip.char_count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {clip.last_used_at
                      ? new Date(clip.last_used_at).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
