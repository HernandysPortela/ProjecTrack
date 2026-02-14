import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Search, Edit, Unlock, Ban, Trash2 } from "lucide-react";

interface Props {
  t: any;
  canCreateUsers: boolean;
  setIsCreateUserDialogOpen: (v: boolean) => void;
  userSearchQuery: string;
  setUserSearchQuery: (v: string) => void;
  filteredUsers: any[];
  openEditDialog: (user: any) => void;
  handleToggleBlock: (id: any, blocked: boolean) => void;
  setUserToDelete: (id: any) => void;
  setIsDeleteDialogOpen: (v: boolean) => void;
}

export default function UsersPage(props: Props) {
  const { t, canCreateUsers, setIsCreateUserDialogOpen, userSearchQuery, setUserSearchQuery, filteredUsers, openEditDialog, handleToggleBlock, setUserToDelete, setIsDeleteDialogOpen } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('users.title')}</h2>
          <p className="text-muted-foreground">{t('users.description')}</p>
        </div>
        {canCreateUsers && (
          <Button onClick={() => setIsCreateUserDialogOpen(true)}>
            <span className="mr-2">+</span>
            {t('users.addUser')}
          </Button>
        )}
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('users.searchUsers')} value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="pl-8" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead>{t('users.email')}</TableHead>
              <TableHead>{t('users.role')}</TableHead>
              <TableHead>{t('users.status')}</TableHead>
              <TableHead>{t('users.joined')}</TableHead>
              <TableHead className="text-right">{t('users.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user._id} className={user.isBlocked ? "opacity-50 bg-muted/50" : ""}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  {user.isBlocked ? (
                    <Badge variant="destructive">{t('users.blocked')}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{t('users.active')}</Badge>
                  )}
                </TableCell>
                <TableCell>{user._creationTime ? new Date(user._creationTime).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('users.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('users.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleBlock(user._id, user.isBlocked || false)}>
                        {user.isBlocked ? (<><Unlock className="mr-2 h-4 w-4" />{t('users.unblock')}</>) : (<><Ban className="mr-2 h-4 w-4" />{t('users.block')}</>)}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => { setUserToDelete(user._id); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="mr-2 h-4 w-4" />{t('users.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
