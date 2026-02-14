import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import CompanySection from "@/components/CompanySection";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { SYSTEM_AREAS, ROLES } from "@/utils/constants";

interface Props {
  t: any;
  settingsTab: "companies" | "permissions";
  setSettingsTab: (v: "companies" | "permissions") => void;
  rolePermissions: any;
  handleUpdatePermission: (role: string, area: string, action: string, value: boolean) => Promise<void>;
  handleResetPermissions: () => Promise<void>;
}

export default function SettingsPage({ t, settingsTab, setSettingsTab, rolePermissions, handleUpdatePermission, handleResetPermissions }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('navigation.settings')}</h2>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as any)}>
        <TabsList>
          <TabsTrigger value="companies">{t('company.title')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('permissions.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-6">
          <CompanySection />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">{t('permissions.title')}</h3>
                <p className="text-muted-foreground">{t('permissions.description')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(t('permissions.resetConfirm'))) {
                    handleResetPermissions();
                    toast.success(t('messages.success.permissionsReset'));
                  }
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('permissions.resetDefaults')}
              </Button>
            </div>

            <div className="grid gap-6">
              {Object.values(ROLES).map((role) => {
                const isOwner = role === ROLES.OWNER;
                const roleKey = role.toLowerCase() as 'owner' | 'manager' | 'collaborator' | 'reader';
                return (
                  <Card key={role} className={isOwner ? "border-primary/50 bg-muted/30" : ""}>
                    <CardHeader>
                      <CardTitle className="capitalize flex items-center gap-2">
                        {t(`roles.${roleKey}`)}
                        {isOwner && (
                          <Badge variant="outline" className="text-xs">{t('permissions.readOnly')}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {isOwner ? t('permissions.ownerDesc') : `${t('permissions.roleDesc')} ${t(`roles.${roleKey}`).toLowerCase()}.`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('permissions.area')}</TableHead>
                            <TableHead className="text-center">{t('permissions.view')}</TableHead>
                            <TableHead className="text-center">{t('permissions.create')}</TableHead>
                            <TableHead className="text-center">{t('permissions.edit')}</TableHead>
                            <TableHead className="text-center">{t('permissions.delete')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(SYSTEM_AREAS).map(([key, area]) => {
                            const perms = rolePermissions?.[role]?.[area] || { view: false, create: false, edit: false, delete: false };
                            return (
                              <TableRow key={area}>
                                <TableCell className="font-medium capitalize">{area.replace("_", " ")}</TableCell>
                                {['view', 'create', 'edit', 'delete'].map((action) => (
                                  <TableCell key={action} className="text-center">
                                    <Switch
                                      checked={isOwner ? true : perms[action as keyof typeof perms]}
                                      disabled={isOwner}
                                      onCheckedChange={(checked) => handleUpdatePermission(role, area, action, checked)}
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
