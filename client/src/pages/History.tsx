import { useTestHistory } from "@/hooks/use-diagnostics";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { StatsChart } from "@/components/stats-chart";
import { History as HistoryIcon, Download, Upload } from "lucide-react";

export default function HistoryPage() {
  const { data: history, isLoading } = useTestHistory();

  // Prepare chart data - sort by time asc
  const chartData = history?.slice().reverse().map(item => ({
    startTime: item.startTime,
    throughput: item.throughputMbps || 0,
    type: item.testType
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Test History</h2>
        <p className="text-muted-foreground mt-1">Review past diagnostic performance results.</p>
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Throughput Trend</CardTitle>
              <CardDescription>Historical performance in Mbps over time.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StatsChart 
            data={chartData} 
            dataKey="throughput" 
            label="Throughput (Mbps)" 
            color="hsl(var(--primary))"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Throughput</TableHead>
                <TableHead className="hidden md:table-cell">Bytes Transferred</TableHead>
                <TableHead className="hidden lg:table-cell">URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : history?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tests recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                history?.map((test) => (
                  <TableRow key={test.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <Badge variant="outline" className={
                        test.testType === "Download" 
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" 
                          : "border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800"
                      }>
                        {test.testType === "Download" ? <Download className="w-3 h-3 mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                        {test.testType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(test.startTime), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={test.status} />
                    </TableCell>
                    <TableCell className="font-bold">
                      {test.throughputMbps ? `${test.throughputMbps.toFixed(2)} Mbps` : "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                      {test.bytesTransferred ? (test.bytesTransferred / 1024 / 1024).toFixed(2) + " MB" : "--"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-muted-foreground text-xs" title={test.url}>
                      {test.url}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
