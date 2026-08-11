import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface TR069Message {
  id: string;
  type: "request" | "response";
  method: string;
  timestamp: string;
  body: string;
}

interface TR069MessageViewerProps {
  messages: TR069Message[];
}

export function TR069MessageViewer({ messages }: TR069MessageViewerProps) {
  const requests = messages.filter(m => m.type === "request");
  const responses = messages.filter(m => m.type === "response");
  
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          TR-069 Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="all" className="text-xs">All ({messages.length})</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">Requests ({requests.length})</TabsTrigger>
            <TabsTrigger value="responses" className="text-xs">Responses ({responses.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <MessageList messages={messages} />
          </TabsContent>
          <TabsContent value="requests">
            <MessageList messages={requests} />
          </TabsContent>
          <TabsContent value="responses">
            <MessageList messages={responses} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MessageList({ messages }: { messages: TR069Message[] }) {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-3 rounded-lg bg-muted/30 border border-border/30"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {msg.type === "request" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                )}
                <span className="text-sm font-medium text-primary">{msg.method}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{msg.timestamp}</span>
            </div>
            <pre className="text-xs font-mono text-muted-foreground bg-background/50 p-2 rounded overflow-x-auto">
              {msg.body}
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
