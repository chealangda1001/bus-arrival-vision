import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Loader2, Database, Cloud, Zap, AlertTriangle } from "lucide-react";

interface TtsLog {
  id: string;
  created_at: string;
  user_email: string | null;
  user_role: string | null;
  destination: string | null;
  plate_number: string | null;
  departure_time: string | null;
  announcement_type: string | null;
  language: string;
  provider: string;
  voice: string | null;
  script_text: string | null;
  script_hash: string | null;
  cache_key: string | null;
  cache_result: string;
  char_count: number | null;
  duration_ms: number | null;
  error_message: string | null;
}

const RESULT_META: Record<string, { label: string; className: string; icon: any }> = {
  client_hit: { label: "Client cache", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: Database },
  storage_hit: { label: "Server cache", className: "bg-sky-500/15 text-sky-600 border-sky-500/30", icon: Cloud },
  generated: { label: "Generated (billed)", className: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Zap },
  error: { label: "Error", className: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
};

interface Props {
  operatorId?: string;
  isSuperAdmin?: boolean;
}

export default function TtsUsageLogs({ operatorId, isSuperAdmin = false }: Props) {
  const [logs, setLogs] = useState<TtsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");

  const loadLogs = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("tts_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!isSuperAdmin && operatorId) query = query.eq("operator_id", operatorId);

    const { data, error } = await query;
    if (error) console.error("Failed to load TTS logs:", error);
    setLogs((data as TtsLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId, isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (resultFilter !== "all" && l.cache_result !== resultFilter) return false;
      if (!q) return true;
      return [l.user_email, l.destination, l.plate_number, l.script_text, l.provider, l.language]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [logs, search, resultFilter]);

  // How many times the SAME script was regenerated despite an existing cache.
  const stats = useMemo(() => {
    const counts = { client_hit: 0, storage_hit: 0, generated: 0, error: 0 } as Record<string, number>;
    const genPerHash = new Map<string, number>();
    let billedChars = 0;
    for (const l of logs) {
      counts[l.cache_result] = (counts[l.cache_result] || 0) + 1;
      if (l.cache_result === "generated") {
        billedChars += l.char_count || 0;
        const key = `${l.script_hash || l.cache_key || l.script_text}`;
        genPerHash.set(key, (genPerHash.get(key) || 0) + 1);
      }
    }
    const duplicateGenerations = Array.from(genPerHash.values()).reduce((sum, n) => sum + Math.max(0, n - 1), 0);
    const total = logs.length || 1;
    return {
      client_hit: counts.client_hit,
      storage_hit: counts.storage_hit,
      generated: counts.generated,
      error: counts.error,
      total: logs.length,
      duplicateGenerations,
      billedChars,
      hitRate: Math.round(((counts.client_hit + counts.storage_hit) / total) * 100),
    };
  }, [logs]);

  // Which trips are costing the most (billed generations only).
  const topTrips = useMemo(() => {
    const map = new Map<string, { destination: string; plate: string; generations: number; chars: number }>();
    for (const l of logs) {
      if (l.cache_result !== "generated") continue;
      const destination = l.destination || "—";
      const plate = l.plate_number || "—";
      const key = `${destination}|${plate}`;
      const row = map.get(key) || { destination, plate, generations: 0, chars: 0 };
      row.generations += 1;
      row.chars += l.char_count || 0;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.generations - a.generations).slice(0, 8);
  }, [logs]);


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cache hit rate</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.hitRate}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Generated (billed)</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.generated}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Repeat generations of same script</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.duplicateGenerations}</p>
            <p className="text-xs text-muted-foreground mt-1">Should stay at 0 when caching works</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total logged requests</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>TTS Request Log</CardTitle>
            <CardDescription>Every TTS call: who requested it, which trip, which script, and whether it was billed.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search user, trip, script..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="generated">Generated (billed)</SelectItem>
                <SelectItem value="storage_hit">Server cache</SelectItem>
                <SelectItem value="client_hit">Client cache</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadLogs} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lang / Provider</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Script</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading..." : "No TTS requests logged yet."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((log) => {
                  const meta = RESULT_META[log.cache_result] || RESULT_META.generated;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{log.user_email || "anonymous"}</div>
                        {log.user_role && <div className="text-muted-foreground">{log.user_role}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{log.destination || "—"}</div>
                        <div className="text-muted-foreground">
                          {[log.plate_number, log.departure_time].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{log.announcement_type || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div className="uppercase">{log.language}</div>
                        <div className="text-muted-foreground">
                          {log.provider}{log.voice ? ` · ${log.voice}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${meta.className} gap-1 whitespace-nowrap`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                        {log.error_message && (
                          <div className="text-[11px] text-destructive mt-1 max-w-[200px] truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[280px]">
                        <div className="truncate" title={log.script_text || ""}>{log.script_text || "—"}</div>
                        <div className="text-muted-foreground">
                          {log.char_count ?? 0} chars{log.duration_ms ? ` · ${log.duration_ms}ms` : ""}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
