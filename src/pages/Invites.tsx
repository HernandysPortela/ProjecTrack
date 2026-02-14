import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  t: any;
  handleSendInvite: (e: React.FormEvent) => void;
  inviteName: string;
  setInviteName: (v: string) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteWorkgroupId: any;
  setInviteWorkgroupId: (v: any) => void;
  workspaces: any[];
  inviteRole: string;
  setInviteRole: (v: any) => void;
  isSendingInvite: boolean;
  invites: any[];
  cancellingInviteId: any;
  handleCancelInvite: (id: any) => void;
}

export default function InvitesPage(props: Props) {
  const { t, handleSendInvite, inviteName, setInviteName, inviteEmail, setInviteEmail, inviteWorkgroupId, setInviteWorkgroupId, workspaces, inviteRole, setInviteRole, isSendingInvite, invites, cancellingInviteId, handleCancelInvite } = props;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('invites.title')}</h2>
        <p className="text-muted-foreground">{t('invites.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('invites.sendInvite')}</CardTitle>
          <CardDescription>{t('invites.sendInviteDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">{t('invites.fullName')}</Label>
              <Input id="invite-name" type="text" placeholder={t('invites.fullNamePlaceholder')} value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('invites.email')}</Label>
              <Input id="invite-email" type="email" placeholder={t('invites.emailPlaceholder')} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-workspace">{t('invites.workspace')}</Label>
              <Select value={inviteWorkgroupId || ""} onValueChange={(value) => setInviteWorkgroupId(value)}>
                <SelectTrigger id="invite-workspace">
                  <SelectValue placeholder={t('invites.selectWorkspace')} />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace._id} value={workspace._id}>{workspace.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('invites.role')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder={t('invites.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLLABORATOR">{t('roles.collaborator')}</SelectItem>
                  <SelectItem value="MANAGER">{t('roles.manager')}</SelectItem>
                  <SelectItem value="READER">{t('roles.reader')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isSendingInvite || !inviteEmail || !inviteName || !inviteWorkgroupId}>
              {isSendingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('invites.sending')}
                </>
              ) : (
                t('invites.sendInviteButton')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invites.pendingInvites')}</CardTitle>
          <CardDescription>{t('invites.pendingInvitesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!invites || invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('invites.noPendingInvites')}</p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">{workspaces.find(w => w._id === invite.workgroupId)?.name || t('invites.unknown')} • {invite.status}</p>
                    <p className="text-xs text-muted-foreground">{t('invites.sent')} {new Date(invite._creationTime).toLocaleDateString()}</p>
                  </div>
                  {invite.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite._id)} disabled={cancellingInviteId === invite._id}>
                      {cancellingInviteId === invite._id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('invites.cancel')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
