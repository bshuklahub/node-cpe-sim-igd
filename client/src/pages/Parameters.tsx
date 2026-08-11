import { Header } from "@/components/Header";
import { useParameters, useUpdateParameter, useResetParameters } from "@/hooks/use-parameters";
import { Search, Edit2, RotateCcw, Lock, Unlock } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Parameters() {
  const { data: parameters, isLoading } = useParameters();
  //const { mutate: updateParam, isPending: isUpdating } = useUpdateParameter();
  const { mutate: updateParam, isPending: isUpdating } = useUpdateParameter();
  const { mutate: resetParams, isPending: isResetting } = useResetParameters();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingParam, setEditingParam] = useState<{ name: string, value: string } | null>(null);

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

            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-sm font-medium transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              Reset Defaults
            </button>
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
    </div>
  );
}
