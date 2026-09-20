import { Header } from "@/components/Header";
import { useParameters, useUpdateParameter, useResetParameters, useBulkInsertParameters } from "@/hooks/use-parameters";
import { Search, Edit2, RotateCcw, Lock, Unlock, Plus } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Example input format for the Insert Parameters dialog.
const SAMPLE_INSERT_TEXT = `#Server initiated UDPEchoDiagnostics
InternetGatewayDevice.UDPEchoConfig=Object
InternetGatewayDevice.UDPEchoConfig.=5
InternetGatewayDevice.UDPEchoConfig.Enable=true\t[boolean]
InternetGatewayDevice.UDPEchoConfig.Interface=WANIPInterface\t[string]
InternetGatewayDevice.UDPEchoConfig.SourceIPAddress=mb1553.idc.devlab.motive.com\t[string]
InternetGatewayDevice.UDPEchoConfig.UDPPort=1122\t[unsignedInt]
InternetGatewayDevice.UDPEchoConfig.EchoPlusEnabled=true\t[boolean]`;

interface ParsedParamRow {
  name: string;
  value: string;
  type: string;
}

interface SkippedRow {
  line: string;
  reason: string;
}

interface ParseResult {
  total: number;
  parsed: ParsedParamRow[];
  skipped: SkippedRow[];
}

/**
 * Parses pasted parameter lines in the format:
 *   Name=Value [type]
 * Lines without a [type] suffix, comments (# prefix), and empty lines are
 * skipped. Returns a summary plus the parsed rows.
 */
function parseInsertText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedParamRow[] = [];
  const skipped: SkippedRow[] = [];
  let total = 0;

  for (const raw of lines) {
    total++;
    const line = raw.trim();
    if (!line) {
      skipped.push({ line: "(empty)", reason: "Empty line" });
      continue;
    }
    if (line.startsWith("#")) {
      skipped.push({ line, reason: "Comment" });
      continue;
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      skipped.push({ line, reason: "Missing '='" });
      continue;
    }
    const name = line.slice(0, eqIdx).trim();
    const rest = line.slice(eqIdx + 1).trim();
    // value and [type] separated by whitespace, e.g. "true	[boolean]"
    const m = rest.match(/^(\S*)\s+\[([^\]]+)\]$/);
    if (!m) {
      skipped.push({ line, reason: "No [type] suffix" });
      continue;
    }
    const type = m[2].trim();
    const value = m[1];
    // Match the parameters table checks (length(name) > 3 AND length(type) > 2)
    if (name.length <= 3) {
      skipped.push({ line, reason: "Name too short" });
      continue;
    }
    if (type.length <= 2) {
      skipped.push({ line, reason: "Type too short" });
      continue;
    }
    parsed.push({ name, value, type });
  }

  return { total, parsed, skipped };
}

export default function Parameters() {
  const { data: parameters, isLoading } = useParameters();
  //const { mutate: updateParam, isPending: isUpdating } = useUpdateParameter();
  const { mutate: updateParam, isPending: isUpdating } = useUpdateParameter();
  const { mutate: resetParams, isPending: isResetting } = useResetParameters();
  const { mutate: bulkInsert, isPending: isInserting } = useBulkInsertParameters();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingParam, setEditingParam] = useState<{ name: string, value: string } | null>(null);

  // Insert Parameters dialog state
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertStep, setInsertStep] = useState<"input" | "preview">("input");
  const [insertText, setInsertText] = useState("");
  const [insertPreview, setInsertPreview] = useState<ParseResult | null>(null);

  const filteredParams = parameters?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.value.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParam) return;

    updateParam(
      { name: editingParam.name, value: editingParam.value },
      {
        onSuccess: () => {
          toast({ title: "Parameter updated", description: `${editingParam.name} saved.` });
          setEditingParam(null);
        },
        onError: (err) => {
          toast({ title: "Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all parameters to default?")) {
      resetParams(undefined, {
        onSuccess: () => toast({ title: "Parameters reset", description: "All values restored to defaults." }),
      });
    }
  };

  const openInsertDialog = () => {
    setInsertText(SAMPLE_INSERT_TEXT);
    setInsertPreview(null);
    setInsertStep("input");
    setInsertOpen(true);
  };

  const handleParse = () => {
    const result = parseInsertText(insertText);
    setInsertPreview(result);
    setInsertStep("preview");
    if (result.parsed.length === 0) {
      toast({
        title: "No valid parameters",
        description: `${result.skipped.length} line(s) skipped, none matched "Name=Value [type]".`,
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (!insertPreview || insertPreview.parsed.length === 0) return;
    bulkInsert(
      insertPreview.parsed.map(p => ({ name: p.name, value: p.value, type: p.type })),
      {
        onSuccess: (result) => {
          toast({
            title: "Parameters inserted",
            description: `Inserted ${result.inserted}, updated ${result.updated}.`,
          });
          setInsertOpen(false);
          setInsertStep("input");
          setInsertText("");
          setInsertPreview(null);
        },
        onError: (err) => {
          toast({ title: "Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header title="Device Parameters" />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter parameters..."
                className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openInsertDialog}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Insert Parameters
              </button>

              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-sm font-medium transition-colors"
              >
                <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-h-full text-sm text-left">
                <thead className="bg-secondary/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-0 py-4">Parameter Name</th>
                    <th className="px-40 py-4">Value</th>
                    <th className="px-60 py-4">Type</th>
                    <th className="px-80 py-4 text-center">Access</th>
                    <th className="px-2 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading parameters...</td>
                    </tr>
                  ) : filteredParams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No parameters found</td>
                    </tr>
                  ) : (
                    filteredParams.map((param) => (
                      <tr key={param.id} className="group hover:bg-secondary/30 transition-colors">
                        <td className="px-0 py-4 font-mono text-primary">{param.name}</td>
                        <td className="px-40 py-4 font-mono text-foreground/80 max-w-md truncate" title={param.value}>
                          {param.value}
                        </td>
                        <td className="px-60 py-4 text-muted-foreground">{param.type}</td>
                        <td className="px-80 py-4 text-center">
                          {param.writable ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                              <Unlock className="w-3 h-3" /> RW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
                              <Lock className="w-3 h-3" /> RO
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {param.writable && (
                            <button
                              onClick={() => setEditingParam({ name: param.name, value: param.value })}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-4 h-4"></Edit2>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Edit parameter dialog */}
      <Dialog open={!!editingParam} onOpenChange={(open) => !open && setEditingParam(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Parameter</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Name</label>
                <input
                  disabled
                  value={editingParam?.name || ''}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Value</label>
                <input
                  value={editingParam?.value || ''}
                  onChange={(e) => setEditingParam(prev => prev ? { ...prev, value: e.target.value } : null)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditingParam(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Insert Parameters dialog */}
      <Dialog open={insertOpen} onOpenChange={(open) => !open && setInsertOpen(false)}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Insert Parameters</DialogTitle>
          </DialogHeader>

          {insertStep === "input" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Paste parameters in <code className="font-mono text-foreground">Name=Value&nbsp;[type]</code> format, one per
                line. Lines without a <code className="font-mono text-foreground">[type]</code> suffix, comments
                starting with <code className="font-mono text-foreground">#</code>, and empty lines are skipped.
                Parsed parameters are imported as writable with notification off.
              </p>
              <textarea
                value={insertText}
                onChange={(e) => setInsertText(e.target.value)}
                rows={14}
                spellCheck={false}
                placeholder="#name=value [type]"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary resize-y"
              />
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setInsertOpen(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParse}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
                >
                  Parse & Preview
                </button>
              </DialogFooter>
            </>
          ) : (
            insertPreview && (
              <>
                {/* Parsing summary */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-semibold">{insertPreview.total}</div>
                    <div className="text-xs text-muted-foreground">Total lines</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-semibold text-green-600">{insertPreview.parsed.length}</div>
                    <div className="text-xs text-muted-foreground">Valid parameters</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-semibold text-amber-600">{insertPreview.skipped.length}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>

                {insertPreview.parsed.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50 border-b border-border uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Value</th>
                          <th className="px-3 py-2 text-left">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 max-h-56 overflow-y-auto">
                        {insertPreview.parsed.map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-mono text-primary">{p.name}</td>
                            <td className="px-3 py-1.5 font-mono text-foreground/80">{p.value}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{p.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">
                    No valid parameter lines found. Go back and fix the input.
                  </p>
                )}

                {insertPreview.skipped.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Show skipped lines ({insertPreview.skipped.length})
                    </summary>
                    <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-secondary/20">
                      {insertPreview.skipped.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-600 shrink-0">{s.reason}</span>
                          <span className="font-mono truncate">{s.line}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => setInsertStep("input")}
                    className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={insertPreview.parsed.length === 0 || isInserting}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isInserting
                      ? "Uploading..."
                      : `Upload ${insertPreview.parsed.length} parameter${insertPreview.parsed.length === 1 ? "" : "s"}`}
                  </button>
                </DialogFooter>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}