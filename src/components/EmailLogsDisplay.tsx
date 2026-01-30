import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface EmailLogsDisplayProps {
  userId: Id<"users">;
}

export function EmailLogsDisplay({ userId }: EmailLogsDisplayProps) {
  const logs = useQuery(api.notifications.getRecentEmailLogs, { userId, limit: 10 });

  if (!logs) {
    return <div className="text-sm text-muted-foreground">Loading email logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No email activity yet. Click "Send Test" to test the email service.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log._id}
          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
        >
          <div className="mt-0.5">
            {log.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{log.subject}</p>
              <Badge variant={log.success ? "default" : "destructive"}>
                {log.success ? "Sent" : "Failed"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">To: {log.email}</p>
            <p className="text-xs text-muted-foreground">
              Event: {log.event}
            </p>
            {log.error && (
              <p className="text-xs text-red-500 mt-1">
                Error: {log.error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {new Date(log._creationTime).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
