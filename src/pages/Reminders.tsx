import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmailLogsDisplay } from "@/components/EmailLogsDisplay";

interface Props {
  t: (key: string) => string;
  currentWorkspaceSettings: any;
  handleUpdateReminderSettings: (key: string, value: boolean) => void | Promise<void>;
  sendingTestEmail: boolean;
  handleTestEmail: () => void | Promise<void>;
  currentUser: any;
}

export default function RemindersPage({ t, currentWorkspaceSettings, handleUpdateReminderSettings, sendingTestEmail, handleTestEmail, currentUser }: Props) {
  return (
    <div className="p-6 w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('reminders.title')}</h2>
          <p className="text-muted-foreground">{t('reminders.description')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reminders.reminderSettings')}</CardTitle>
          <CardDescription>{t('reminders.reminderSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>{t('reminders.enableReminders')}</Label>
              <p className="text-sm text-muted-foreground">{t('reminders.enableRemindersDesc')}</p>
            </div>
            <Switch checked={currentWorkspaceSettings?.enabled ?? false} onCheckedChange={(checked) => handleUpdateReminderSettings('enabled', checked)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>{t('reminders.includeOverdue')}</Label>
              <p className="text-sm text-muted-foreground">{t('reminders.includeOverdueDesc')}</p>
            </div>
            <Switch checked={currentWorkspaceSettings?.includeOverdue ?? false} onCheckedChange={(checked) => handleUpdateReminderSettings('includeOverdue', checked)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>{t('reminders.notifyProjectChanges')}</Label>
              <p className="text-sm text-muted-foreground">{t('reminders.notifyProjectChangesDesc')}</p>
            </div>
            <Switch checked={currentWorkspaceSettings?.notifyOnProjectChanges ?? false} onCheckedChange={(checked) => handleUpdateReminderSettings('notifyOnProjectChanges', checked)} />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('reminders.testEmailService')}</Label>
                <p className="text-sm text-muted-foreground">{t('reminders.testEmailServiceDesc')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={sendingTestEmail}>{sendingTestEmail ? t('reminders.sending') : t('reminders.sendTest')}</Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">{t('reminders.recentEmailActivity')}</h4>
              {currentUser && <EmailLogsDisplay userId={currentUser._id} />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
