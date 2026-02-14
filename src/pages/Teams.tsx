import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users as UsersIcon, Plus, MoreVertical, Edit, UserPlus, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  t: any;
  teams: any[];
  canCreateTeams: boolean;
  setIsCreateTeamDialogOpen: (v: boolean) => void;
  canEditTeams: boolean;
  openEditTeamDialog: (team: any) => void;
  openAddTeamMemberDialog: (teamId: any) => void;
  canDeleteTeams: boolean;
  openDeleteTeamDialog: (id: any) => void;
  handleRemoveTeamMember: (teamId: any, userId: any) => void;
}

export default function TeamsPage(props: Props) {
  const { t, teams, canCreateTeams, setIsCreateTeamDialogOpen, canEditTeams, openEditTeamDialog, openAddTeamMemberDialog, canDeleteTeams, openDeleteTeamDialog, handleRemoveTeamMember } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('teams.title')}</h2>
          <p className="text-muted-foreground">{t('teams.description')}</p>
        </div>
        {canCreateTeams && (
          <Button onClick={() => setIsCreateTeamDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('teams.createTeam')}
          </Button>
        )}
      </div>

      {!teams ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t('teams.noTeams')}</h3>
            <p className="text-muted-foreground mb-4">{t('teams.createTeamDesc')}</p>
            {canCreateTeams && (
              <Button onClick={() => setIsCreateTeamDialogOpen(true)}>{t('teams.createTeam')}</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team: any) => (
            <Card key={team._id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription className="mt-1">{team.description || "No description"}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEditTeams && (
                        <DropdownMenuItem onClick={() => openEditTeamDialog(team)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('teams.edit')}
                        </DropdownMenuItem>
                      )}
                      {canCreateTeams && (
                        <DropdownMenuItem onClick={() => openAddTeamMemberDialog(team._id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          {t('teams.addMember')}
                        </DropdownMenuItem>
                      )}
                      {canDeleteTeams && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteTeamDialog(team._id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('teams.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      {t('teams.members')} ({team.memberCount})
                    </h4>
                    <ScrollArea className="h-[120px] w-full rounded-md border p-2">
                      {team.members && team.members.length > 0 ? (
                        <div className="space-y-2">
                          {team.members.map((member: any) => (
                            <div key={member._id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.imageUrl ?? undefined} alt={member.name || "Member"} className="object-cover" />
                                  <AvatarFallback>{(member.name?.charAt(0) || "M").toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span>{member.name}</span>
                              </div>
                              {canEditTeams && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveTeamMember(team._id, member._id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">No members yet</p>
                      )}
                    </ScrollArea>
                  </div>
                  <div className="text-xs text-muted-foreground">Created by {team.creatorName}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
