import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { EmailLogsDisplay } from "@/components/EmailLogsDisplay";
import { useNavigate } from "react-router";
import * as React from "react";
import { useEffect, useState } from "react";
import WorkgroupView from "@/pages/WorkgroupView";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Mail,
  Bell,
  CheckSquare,
  Calendar as CalendarIcon,
  ChevronRight,
  Menu,
  X,
  Building2,
  UserCircle,
  RotateCcw,
  Loader2,
  FolderKanban,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  UserPlus,
  Edit,
  Trash2,
  ArrowRight,
  Home,
  User,
  Ban,
  Unlock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Id } from "@convex/_generated/dataModel";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useMemo } from "react";
import { ProfileSection } from "@/components/ProfileSection";
import CompanySection from "@/components/CompanySection";
import ProjectsSection from "@/components/ProjectsSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SYSTEM_AREAS, ROLES, Role } from "@/utils/constants";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, user: currentUser, signOut } = useAuth();
  const dashboardOverview = useQuery(api.dashboard.getOverview);
  const { t, language, setLanguage } = useLanguage();

  const userInitials = useMemo(() => {
    if (currentUser?.name) {
      return currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (currentUser?.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [currentUser?.name, currentUser?.email]);

  console.log("Dashboard currentUser:", currentUser);
  console.log("Dashboard currentUser imageUrl:", (currentUser as any)?.imageUrl);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const [currentSection, setCurrentSection] = useState("dashboard");

  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workgroupName, setWorkgroupName] = useState("");
  const [workgroupDescription, setWorkgroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWorkgroupId, setSelectedWorkgroupId] = useState<Id<"workgroups"> | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectManagerId, setProjectManagerId] = useState<Id<"users"> | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectTeamRestricted, setProjectTeamRestricted] = useState(false);
  const [projectAllowedTeamIds, setProjectAllowedTeamIds] = useState<Id<"teams">[]>([]);

  // Invite states
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [removingWorkspaceMemberId, setRemovingWorkspaceMemberId] = useState<Id<"workgroup_members"> | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("COLLABORATOR");
  const [inviteWorkgroupId, setInviteWorkgroupId] = useState<Id<"workgroups"> | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [cancellingInviteId, setCancellingInviteId] = useState<Id<"invites"> | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // State for editing user
  const [editingUser, setEditingUser] = useState<any>(null);

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole((user.role as "owner" | "manager" | "collaborator" | "reader") || "reader");
    setIsEditUserDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditingUser(true);
    try {
      await updateUser({
        userId: editingUser._id,
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
      });
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      toast.success(t('messages.success.userUpdated'));
    } catch (error) {
      toast.error(t('messages.error.updateUser'));
    } finally {
      setIsEditingUser(false);
    }
  };

  const openWorkspaceSettings = (workgroup: any) => {
    setWorkspaceForSettings(workgroup);
    setWorkspaceMemberEmail("");
    setWorkspaceMemberRole(ROLES.COLLABORATOR);
    setIsWorkspaceSettingsDialogOpen(true);
  };

  const closeWorkspaceSettings = () => {
    setIsWorkspaceSettingsDialogOpen(false);
    setWorkspaceForSettings(null);
    setWorkspaceMemberEmail("");
    setWorkspaceMemberRole(ROLES.COLLABORATOR);
    setRemovingWorkspaceMemberId(null);
  };

  const handleAddWorkspaceMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceForSettings?._id) return;
    if (!workspaceMemberEmail.trim()) {
      toast.error(t('messages.error.invalidEmail'));
      return;
    }

    setIsAddingWorkspaceMember(true);
    try {
      await addWorkspaceMember({
        workgroupId: workspaceForSettings._id,
        email: workspaceMemberEmail.trim(),
        role: workspaceMemberRole,
      });
      toast.success(t('messages.success.userAddedToWorkspace'));
      setWorkspaceMemberEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.error.addUserToWorkspace');
      toast.error(message);
    } finally {
      setIsAddingWorkspaceMember(false);
    }
  };

  const handleAddTeamToWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceForSettings || !workspaceTeamId) return;

    setIsAddingTeamToWorkspace(true);
    try {
      await addTeamToWorkgroup({
        workgroupId: workspaceForSettings._id,
        teamId: workspaceTeamId as Id<"teams">,
        role: workspaceTeamRole,
      });
      toast.success(t('messages.success.teamUpdated'));
      setWorkspaceTeamId("");
      setWorkspaceTeamRole(ROLES.COLLABORATOR);
    } catch (error) {
      console.error("Error adding team to workspace:", error);
      toast.error(t('messages.error.createTeam'));
    } finally {
      setIsAddingTeamToWorkspace(false);
    }
  };

  const handleRemoveWorkspaceMember = async (membershipId: Id<"workgroup_members">) => {
    if (!workspaceForSettings?._id) return;
    setRemovingWorkspaceMemberId(membershipId);
    try {
      await removeWorkspaceMember({
        workgroupId: workspaceForSettings._id,
        membershipId: membershipId,
      });
      toast.success(t('messages.success.teamMemberRemoved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.error.removeTeamMember');
      toast.error(message);
    } finally {
      setRemovingWorkspaceMemberId(null);
    }
  };

  // State for adding user to workspace
  const [isAddToWorkspaceOpen, setIsAddToWorkspaceOpen] = useState(false);
  const [selectedUserForWorkspace, setSelectedUserForWorkspace] = useState<any>(null);
  const [selectedWorkspaceForUser, setSelectedWorkspaceForUser] = useState<string>("");
  const [roleForWorkspace, setRoleForWorkspace] = useState<"owner" | "manager" | "collaborator" | "reader">("collaborator");

  // Filter states
  const [projectFilter, setProjectFilter] = useState<"all" | "in progress" | "paused" | "finished">("all");

  // User management states
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"owner" | "manager" | "collaborator" | "reader">("reader");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState<"owner" | "manager" | "collaborator" | "reader">("reader");
  const [isEditingUser, setIsEditingUser] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Id<"users"> | null>(null);

  const [isAddToWorkspaceDialogOpen, setIsAddToWorkspaceDialogOpen] = useState(false);
  const [userToAddToWorkspace, setUserToAddToWorkspace] = useState<any>(null);
  const [selectedWorkspaceForAdd, setSelectedWorkspaceForAdd] = useState<Id<"workgroups"> | null>(null);
  const [selectedRoleForAdd, setSelectedRoleForAdd] = useState<"owner" | "manager" | "collaborator" | "reader">("reader");
  const [isAddingToWorkspace, setIsAddingToWorkspace] = useState(false);

  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Id<"users">[]>([]);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Id<"teams"> | null>(null);

  const [isAddTeamMemberDialogOpen, setIsAddTeamMemberDialogOpen] = useState(false);
  const [selectedTeamIdForMember, setSelectedTeamIdForMember] = useState<Id<"teams"> | null>(null);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState<Id<"users"> | null>(null);

  const openAddTeamMemberDialog = (teamId: Id<"teams">) => {
    setSelectedTeamIdForMember(teamId);
    setSelectedUserForTeam(null);
    setIsAddTeamMemberDialogOpen(true);
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamIdForMember || !selectedUserForTeam) return;

    try {
      await addTeamMember({
        teamId: selectedTeamIdForMember,
        userId: selectedUserForTeam,
        role: "collaborator",
      });
      toast.success(t('messages.success.teamMemberAdded'));
      setIsAddTeamMemberDialogOpen(false);
      setSelectedUserForTeam(null);
      setSelectedTeamIdForMember(null);
    } catch (error) {
      toast.error(t('messages.error.addTeamMember'));
    }
  };

  const handleRemoveTeamMember = async (teamId: Id<"teams">, userId: Id<"users">) => {
    try {
      await removeTeamMember({ teamId, userId });
      toast.success(t('messages.success.teamMemberRemoved'));
    } catch (error) {
      toast.error(t('messages.error.removeTeamMember'));
    }
  };

  const [isDeleteWorkspaceDialogOpen, setIsDeleteWorkspaceDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Id<"workgroups"> | null>(null);

  // Task Filter States
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "urgent" | "high" | "medium" | "low">("all");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<"all" | "me">("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "active" | "todo" | "in-progress" | "review" | "done" | "blocked">("active");
  const [taskSortBy, setTaskSortBy] = useState<"dueDate" | "priority">("dueDate");

  const [isWorkspaceSettingsDialogOpen, setIsWorkspaceSettingsDialogOpen] = useState(false);
  const [workspaceForSettings, setWorkspaceForSettings] = useState<any>(null);
  const [workspaceMemberEmail, setWorkspaceMemberEmail] = useState("");
  const [workspaceMemberRole, setWorkspaceMemberRole] = useState<Role>(ROLES.COLLABORATOR);
  const [isAddingWorkspaceMember, setIsAddingWorkspaceMember] = useState(false);

  // Team workspace sharing state
  const [workspaceTeamId, setWorkspaceTeamId] = useState<string>("");
  const [workspaceTeamRole, setWorkspaceTeamRole] = useState<Role>(ROLES.COLLABORATOR);
  const [isAddingTeamToWorkspace, setIsAddingTeamToWorkspace] = useState(false);

  // Settings tab state
  const [settingsTab, setSettingsTab] = useState<"companies" | "permissions">("companies");

  // Queries
  const workspaces = useQuery(api.workgroups.list) || [];
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workgroups"> | null>(null);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0]._id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const selectedWorkspace = workspaces.find((w) => w._id === selectedWorkspaceId) || workspaces[0];

  // Fetch data
  const allUsers = useQuery(api.users.listAll) || [];
  const teams = useQuery(api.teams.list) || [];
  const rolePermissions = useQuery(api.permissions.getRolePermissions);
  const reminderSettings = useQuery(api.reminders.getAllUserSettings, currentUser ? { userId: currentUser._id } : "skip");

  const currentWorkspaceSettings = reminderSettings?.find(s => s.workgroupId === selectedWorkspace?._id);

  const recentEmailLogs = useQuery(api.notifications.getRecentEmailLogs, currentUser ? { userId: currentUser._id } : "skip");
  const invites = useQuery(api.invites.list, selectedWorkspaceId ? { workgroupId: selectedWorkspaceId } : "skip");

  const workspaceMembers = useQuery(
    api.workgroups.listMembers,
    workspaceForSettings ? { workgroupId: workspaceForSettings._id } : "skip"
  );

  // Mutations
  const sendInvite = useMutation(api.invites.create);
  const cancelInvite = useMutation(api.invites.cancel);
  const createWorkgroup = useMutation(api.workgroups.create);
  // const updateWorkgroup = useMutation(api.workgroups.updateWorkgroup); // Removed as it doesn't exist
  const deleteWorkgroup = useMutation(api.workgroups.deleteWorkgroup);
  const addMemberToWorkgroup = useMutation(api.workgroups.addMember);
  const removeMemberFromWorkgroup = useMutation(api.workgroups.removeMember);
  const addTeamToWorkgroup = useMutation(api.workgroups.addTeamToWorkgroup);
  const createProject = useMutation(api.projects.create);
  const updateProjectMutation = useMutation(api.projects.updateProject);
  const createUser = useMutation(api.admin.createUser);
  const updateUser = useMutation(api.admin.updateUser);
  const deleteUser = useMutation(api.admin.deleteUser);
  const addUserToWorkgroup = useMutation(api.admin.addUserToWorkgroup);
  const updateGlobalUserRole = useMutation(api.admin.updateGlobalUserRole);
  const toggleUserBlock = useMutation(api.admin.toggleUserBlock);
  const updateLanguageMutation = useMutation(api.users.updateLanguage);
  const createTeam = useMutation(api.teams.create);
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const addTeamMember = useMutation(api.teams.addMember);
  const removeTeamMember = useMutation(api.teams.removeMember);
  const updatePermission = useMutation(api.permissions.updateRolePermission);
  const resetPermissions = useMutation(api.permissions.resetToDefaults);
  const toggleBlock = useMutation(api.admin.toggleUserBlock);
  const updateReminderSettings = useMutation(api.reminders.updateSettings);
  const testReminderEmail = useMutation(api.reminders.testReminderEmail);
  const addWorkspaceMember = useMutation(api.workgroups.addMember);
  const removeWorkspaceMember = useMutation(api.workgroups.removeMember);
  const updateProjectStatus = useMutation(api.projects.updateStatus);

  // Permission checks
  const canViewWorkspaces = rolePermissions?.[currentUser?.role || "reader"]?.workspaces?.view ?? false;
  const canCreateWorkspaces = rolePermissions?.[currentUser?.role || "reader"]?.workspaces?.create ?? false;
  const canEditWorkspaces = rolePermissions?.[currentUser?.role || "reader"]?.workspaces?.edit ?? false;
  const canDeleteWorkspaces = rolePermissions?.[currentUser?.role || "reader"]?.workspaces?.delete ?? false;

  const canManageWorkspaceMembers =
    !!(
      workspaceForSettings &&
      currentUser &&
      (canEditWorkspaces || workspaceForSettings.ownerId === currentUser._id)
    );

  // Check user permissions from rolePermissions
  const canViewUsers = rolePermissions?.[currentUser?.role || "reader"]?.system_users?.view ?? false;
  const canCreateUsers = rolePermissions?.[currentUser?.role || "reader"]?.system_users?.create ?? false;
  const canEditUsers = rolePermissions?.[currentUser?.role || "reader"]?.system_users?.edit ?? false;
  const canDeleteUsers = rolePermissions?.[currentUser?.role || "reader"]?.system_users?.delete ?? false;

  // Check team permissions from rolePermissions
  const canViewTeams = rolePermissions?.[currentUser?.role || "reader"]?.teams?.view ?? false;
  const canCreateTeams = rolePermissions?.[currentUser?.role || "reader"]?.teams?.create ?? false;
  const canEditTeams = rolePermissions?.[currentUser?.role || "reader"]?.teams?.edit ?? false;
  const canDeleteTeams = rolePermissions?.[currentUser?.role || "reader"]?.teams?.delete ?? false;

  // NEW: Permission section access control
  const canViewPermissions = currentUser?.role === "owner" || currentUser?.role === "manager";
  const canEditPermissions = currentUser?.role === "owner";

  // Derived State
  const selectedWorkgroup = useMemo(() =>
    dashboardOverview?.workgroups?.find((w: any) => w._id === selectedWorkgroupId),
    [dashboardOverview?.workgroups, selectedWorkgroupId]
  );

  const selectedWorkgroupProjects = useMemo(() =>
    dashboardOverview?.projects?.filter((p: any) => p.workgroupId === selectedWorkgroupId) || [],
    [dashboardOverview?.projects, selectedWorkgroupId]
  );

  const filteredProjects = useMemo(() => {
    if (!selectedWorkgroupProjects) return [];
    if (projectFilter === "all") return selectedWorkgroupProjects;
    return selectedWorkgroupProjects.filter((p: any) => p.status === projectFilter);
  }, [selectedWorkgroupProjects, projectFilter]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return null;
    if (!userSearchQuery) return allUsers;
    const query = userSearchQuery.toLowerCase();
    return allUsers.filter((u: any) =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  }, [allUsers, userSearchQuery]);

  // Filter available managers based on selected teams
  const availableManagers = useMemo(() => {
    if (!currentUser) return [];

    if (!projectTeamRestricted || projectAllowedTeamIds.length === 0) {
      return [currentUser];
    }

    if (!teams || teams.length === 0) {
      return [currentUser];
    }

    const membersFromSelectedTeams =
      teams
        .filter((team: any) => projectAllowedTeamIds.includes(team._id))
        .flatMap((team: any) => team.members ?? []) ?? [];

    const uniqueMembers: any[] = [];
    const seen = new Set<string>();

    for (const member of membersFromSelectedTeams) {
      if (!member?._id) continue;
      if (seen.has(member._id)) continue;
      seen.add(member._id);
      uniqueMembers.push(member);
    }

    return uniqueMembers.length > 0 ? uniqueMembers : [currentUser];
  }, [currentUser, projectTeamRestricted, projectAllowedTeamIds, teams]);

  // Ensure the project manager field stays in sync with the current selection rules
  useEffect(() => {
    if (!currentUser) return;

    // When no team restriction (or no teams picked), always default to the current user
    if (!projectTeamRestricted || projectAllowedTeamIds.length === 0) {
      if (projectManagerId !== currentUser._id) {
        setProjectManagerId(currentUser._id);
      }
      return;
    }

    // If teams are selected but no members are available yet, keep the current user selected
    if (availableManagers.length === 0) {
      if (projectManagerId !== currentUser._id) {
        setProjectManagerId(currentUser._id);
      }
      return;
    }

    // If the currently selected manager is no longer valid, pick the first available member
    const isManagerStillValid = availableManagers.some(
      (manager) => manager._id === projectManagerId
    );

    if (!isManagerStillValid) {
      setProjectManagerId(availableManagers[0]._id);
    }
  }, [
    currentUser,
    projectTeamRestricted,
    projectAllowedTeamIds,
    availableManagers,
    projectManagerId,
  ]);

  // Handlers
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCreateWorkgroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsCreating(true);
    try {
      await createWorkgroup({
        name: workgroupName,
        description: workgroupDescription,
      });
      setIsCreateDialogOpen(false);
      setWorkgroupName("");
      setWorkgroupDescription("");
      toast.success(t('messages.success.workspaceCreated'));
    } catch (error) {
      toast.error(t('messages.error.createWorkspace'));
    } finally {
      setIsCreating(false);
    }
  };

  const openDeleteWorkspaceDialog = (workgroupId: Id<"workgroups">) => {
    setWorkspaceToDelete(workgroupId);
    setIsDeleteWorkspaceDialogOpen(true);
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    try {
      await deleteWorkgroup({ workgroupId: workspaceToDelete });
      setIsDeleteWorkspaceDialogOpen(false);
      setWorkspaceToDelete(null);
      if (selectedWorkgroupId === workspaceToDelete) {
        setSelectedWorkgroupId(null);
        setCurrentSection("dashboard");
      }
      toast.success(t('messages.success.workspaceDeleted'));
    } catch (error) {
      toast.error(t('messages.error.deleteWorkspace'));
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage as 'pt-BR' | 'en' | 'es');
    try {
      await updateLanguageMutation({ language: newLanguage as 'pt-BR' | 'en' | 'es' });
    } catch (error) {
      console.error("Failed to update language in database:", error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkgroup) return;

    setIsCreatingProject(true);
    try {
      await createProject({
        name: projectName,
        description: projectDescription,
        workgroupId: selectedWorkgroup._id,
        color: "#3b82f6", // Default color
        teamRestricted: projectTeamRestricted,
        allowedTeamIds: projectTeamRestricted ? projectAllowedTeamIds : [],
      });
      setProjectName("");
      setProjectDescription("");
      setProjectManagerId(null);
      setProjectTeamRestricted(false);
      setProjectAllowedTeamIds([]);
      setIsCreateProjectDialogOpen(false);
      toast.success(t('messages.success.projectCreated'));
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(t('messages.error.createProject'));
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleToggleProjectStatus = async (projectId: Id<"projects">, currentStatus: string | undefined) => {
    try {
      const newStatus = currentStatus === "finished" ? "in progress" : "finished";
      await updateProjectStatus({
        projectId,
        status: newStatus,
      });
      toast.success(t('messages.success.projectStatusUpdated'));
    } catch (error) {
      toast.error(t('messages.error.updateProjectStatus'));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await createUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      });
      setIsCreateUserDialogOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("reader");
      toast.success(t('messages.success.userCreated'));
    } catch (error) {
      toast.error(t('messages.error.createUser'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const openDeleteDialog = (userId: Id<"users">) => {
    setUserToDelete(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser({ userId: userToDelete });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      toast.success(t('messages.success.userDeleted'));
    } catch (error) {
      toast.error(t('messages.error.deleteUser'));
    }
  };

  const openAddToWorkspaceDialog = (userId: Id<"users">) => {
    const user = allUsers?.find(u => u._id === userId);
    setUserToAddToWorkspace(user);
    setIsAddToWorkspaceDialogOpen(true);
  };

  const handleAddToWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToAddToWorkspace || !selectedWorkspaceForAdd) return;
    setIsAddingToWorkspace(true);
    try {
      await addUserToWorkgroup({
        userId: userToAddToWorkspace._id,
        workgroupId: selectedWorkspaceForAdd,
        role: selectedRoleForAdd,
      });
      setIsAddToWorkspaceDialogOpen(false);
      setUserToAddToWorkspace(null);
      setSelectedWorkspaceForAdd(null);
      toast.success(t('messages.success.userAddedToWorkspace'));
    } catch (error) {
      toast.error(t('messages.error.addUserToWorkspace'));
    } finally {
      setIsAddingToWorkspace(false);
    }
  };

  const handleUpdateRole = async (userId: Id<"users">, role: "owner" | "manager" | "collaborator" | "reader") => {
    try {
      await updateUser({ userId, role });
      toast.success(t('messages.success.userRoleUpdated'));
    } catch (error) {
      toast.error(t('messages.error.updateUserRole'));
    }
  };

  const handleToggleBlock = async (userId: Id<"users">, currentBlockStatus: boolean) => {
    try {
      await toggleUserBlock({ userId });
      toast.success(currentBlockStatus ? t('messages.success.userUnblocked') : t('messages.success.userBlocked'));
    } catch (error) {
      console.error("Toggle block error:", error);
      const errorMessage = error instanceof Error ? error.message : t('messages.error.toggleUserBlock');
      toast.error(errorMessage);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTeam(true);
    try {
      await createTeam({
        name: teamName,
        description: teamDescription,
        memberIds: selectedTeamMembers,
      });
      setIsCreateTeamDialogOpen(false);
      setTeamName("");
      setTeamDescription("");
      setSelectedTeamMembers([]);
      toast.success(t('messages.success.teamCreated'));
    } catch (error) {
      toast.error(t('messages.error.createTeam'));
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const openEditTeamDialog = (team: any) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description || "");
    setIsEditTeamDialogOpen(true);
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setIsEditingTeam(true);
    try {
      await updateTeam({
        id: editingTeam._id,
        name: editTeamName,
        description: editTeamDescription,
      });
      setIsEditTeamDialogOpen(false);
      setEditingTeam(null);
      toast.success(t('messages.success.teamUpdated'));
    } catch (error) {
      toast.error(t('messages.error.updateTeam'));
    } finally {
      setIsEditingTeam(false);
    }
  };

  const openDeleteTeamDialog = (teamId: Id<"teams">) => {
    setTeamToDelete(teamId);
    setIsDeleteTeamDialogOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeam({ id: teamToDelete });
      setIsDeleteTeamDialogOpen(false);
      setTeamToDelete(null);
      toast.success(t('messages.success.teamDeleted'));
    } catch (error) {
      toast.error(t('messages.error.deleteTeam'));
    }
  };

  const handleUpdatePermission = async (
    role: string,
    area: string,
    action: string,
    value: boolean
  ) => {
    const currentPerms = rolePermissions?.[role]?.[area] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };

    try {
      await updatePermission({
        role,
        area,
        canView: action === "view" ? value : currentPerms.view,
        canCreate: action === "create" ? value : currentPerms.create,
        canEdit: action === "edit" ? value : currentPerms.edit,
        canDelete: action === "delete" ? value : currentPerms.delete,
      });
      toast.success(t('messages.success.permissionUpdated'));
    } catch (error) {
      console.error(error);
      toast.error(t('messages.error.updatePermission'));
    }
  };

  const handleResetPermissions = async () => {
    try {
      await resetPermissions();
      toast.success(t('messages.success.permissionsReset'));
    } catch (error) {
      toast.error(t('messages.error.resetPermissions'));
    }
  };

  // Invite handlers
  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error(t('messages.error.fillAllFields'));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error(t('messages.error.invalidEmail'));
      return;
    }

    if (!inviteWorkgroupId) {
      toast.error(t('messages.error.selectWorkspace'));
      return;
    }

    setIsSendingInvite(true);
    try {
      await sendInvite({ email: inviteEmail, name: inviteName, role: inviteRole, workgroupId: inviteWorkgroupId as Id<"workgroups"> });
      toast.success(t('messages.success.inviteSent'));
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("COLLABORATOR");
      setInviteWorkgroupId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId: Id<"invites">) => {
    try {
      await cancelInvite({ id: inviteId });
      toast.success(t('messages.success.inviteCancelled'));
    } catch (error: any) {
      toast.error(error.message || t('messages.error.cancelInvite'));
    }
  };

  const handleTestEmail = async () => {
    if (!currentUser || !selectedWorkspace) return;
    setSendingTestEmail(true);
    try {
      const result = await testReminderEmail({
        userId: currentUser._id,
        workgroupId: selectedWorkspace._id as Id<"workgroups">,
      });
      if (result.success) {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(t('messages.error.sendTestEmail'));
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleUpdateReminderSettings = async (key: string, value: boolean) => {
    if (!currentUser || !selectedWorkspace) return;
    try {
      await updateReminderSettings({
        userId: currentUser._id,
        workgroupId: selectedWorkspace._id as Id<"workgroups">,
        enabled: key === "enabled" ? value : (currentWorkspaceSettings?.enabled ?? false),
        includeOverdue: key === "includeOverdue" ? value : (currentWorkspaceSettings?.includeOverdue ?? false),
        notifyOnProjectChanges: key === "notifyOnProjectChanges" ? value : (currentWorkspaceSettings?.notifyOnProjectChanges ?? false),
      });
      toast.success(t('messages.success.settingsUpdated'));
    } catch (error) {
      toast.error(t('messages.error.updateSettings'));
    }
  };

  // Memoized filtered tasks - MOVED HERE
  const filteredTasks = useMemo(() => {
    // Choose the correct task list based on assignee filter
    const taskList = taskAssigneeFilter === "me"
      ? dashboardOverview?.myTasksList
      : dashboardOverview?.myTasksList;

    if (!taskList) return [];

    const filtered = taskList.filter((task: any) => {
      if (taskProjectFilter !== "all" && task.projectId !== taskProjectFilter) return false;

      if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;

      // Status filter - "active" means all except "done"
      if (taskStatusFilter === "active") {
        if (task.status === "done") return false;
      } else if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) {
        return false;
      }

      return true;
    });

    // Sort the filtered tasks
    const sorted = [...filtered].sort((a: any, b: any) => {
      switch (taskSortBy) {
        case "dueDate":
          // Tasks without due dates go to the end
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Sort by due date ascending (overdue and upcoming first)
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

        case "priority":
          // Sort from highest to lowest priority: urgent → high → medium → low
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          const aPriority = priorityOrder[a.priority] ?? 999;
          const bPriority = priorityOrder[b.priority] ?? 999;
          return aPriority - bPriority;

        default:
          return 0;
      }
    });

    return sorted;
  }, [dashboardOverview?.myTasksList, dashboardOverview?.myExternalTasksList, taskProjectFilter, taskPriorityFilter, taskAssigneeFilter, taskStatusFilter, taskSortBy]);

  const taskProjects = useMemo(() => {
    if (!dashboardOverview?.myTasksList) return [];

    const projectMap = new Map<string, { id: string; name: string }>();
    dashboardOverview.myTasksList.forEach((task) => {
      if (!projectMap.has(task.projectId)) {
        projectMap.set(task.projectId, {
          id: task.projectId,
          name: task.projectName || t('dashboard.unnamedProject'),
        });
      }
    });

    return Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dashboardOverview?.myTasksList]);

  // Early return for loading state
  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is authenticated but dashboard data is still loading
  if (dashboardOverview === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If dashboard query returned null (shouldn't happen if user exists, but handle it)
  if (dashboardOverview === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{t('dashboard.errorLoadingDashboardData')}</p>
          <Button onClick={() => window.location.reload()}>{t('dashboard.reload')}</Button>
        </div>
      </div>
    );
  }

  const workgroups = dashboardOverview.workgroups || [];
  const projects = dashboardOverview.projects || [];
  const stats = dashboardOverview.stats;
  const recentActivity = dashboardOverview.recentActivity;

  const renderContent = () => {
    if (selectedWorkgroupId) {
      return <WorkgroupView workgroupId={selectedWorkgroupId} />;
    }

    switch (currentSection) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{t('dashboard.overview')}</h2>
              <p className="text-muted-foreground">
                {t('dashboard.overviewDesc')}
              </p>
            </div>

            {!dashboardOverview ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t('dashboard.totalWorkspaces')}
                      </CardTitle>
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardOverview.stats.totalWorkspaces}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t('dashboard.totalProjects')}
                      </CardTitle>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardOverview.stats.totalProjects}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t('dashboard.myTasks')}
                      </CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardOverview.stats.myTasks}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t('dashboard.overdueTasks')}
                      </CardTitle>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {dashboardOverview.stats.overdueTasks}
                      </div>
                      {dashboardOverview.stats.myOverdueTasks > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {dashboardOverview.stats.myOverdueTasks} {t('dashboard.assignedToYou')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Task Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.taskStatusDistribution')}</CardTitle>
                    <CardDescription>
                      {t('dashboard.taskStatusDistributionDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                      {Object.entries(dashboardOverview.tasksByStatus)
                        .sort(([a], [b]) => {
                          const order = ["todo", "in_progress", "review", "done", "blocked"];
                          const aIndex = order.indexOf(a);
                          const bIndex = order.indexOf(b);
                          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
                          return a.localeCompare(b);
                        })
                        .map(([status, count]) => {
                          const displayName = status
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');

                          let colorClass = "text-gray-600";
                          if (status.includes("done") || status.includes("complete") || status.includes("finalizado")) {
                            colorClass = "text-green-600";
                          } else if (status.includes("progress") || status.includes("doing")) {
                            colorClass = "text-blue-600";
                          } else if (status.includes("review") || status.includes("testing")) {
                            colorClass = "text-yellow-600";
                          } else if (status.includes("blocked") || status.includes("stuck")) {
                            colorClass = "text-red-600";
                          } else if (status.includes("todo")) {
                            colorClass = "text-slate-600";
                          }

                          return (
                            <div key={status} className="flex flex-col">
                              <span className="text-sm text-muted-foreground">{displayName}</span>
                              <span className={`text-2xl font-bold ${colorClass}`}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Overdue Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        {t('dashboard.overdueTasks')}
                      </CardTitle>
                      <CardDescription>
                        {t('dashboard.overduetasksDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dashboardOverview.overdueTasksList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('dashboard.noOverdueTasks')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardOverview.overdueTasksList.map((task) => (
                            <div
                              key={task._id}
                              className="flex items-start justify-between p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors cursor-pointer"
                              onClick={() => navigate(`/project/${task.projectId}?taskId=${task._id}`)}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.projectName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-destructive font-medium">
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString()
                                    : t('dashboard.noDueDate')}
                                </p>
                                {task.assigneeName && (
                                  <p className="text-xs text-muted-foreground">
                                    {task.assigneeName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* On-Time Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {t('dashboard.onTimeTasks')}
                      </CardTitle>
                      <CardDescription>
                        {t('dashboard.onTimeTasksDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dashboardOverview.onTimeTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('dashboard.noOnTimeTasks')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardOverview.onTimeTasks.map((task) => (
                            <div
                              key={task._id}
                              className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => navigate(`/project/${task.projectId}?taskId=${task._id}`)}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.projectName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString()
                                    : "No due date"}
                                </p>
                                {task.assigneeName && (
                                  <p className="text-xs text-muted-foreground">
                                    {task.assigneeName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Upcoming Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {t('dashboard.upcomingTasks')}
                      </CardTitle>
                      <CardDescription>
                        {t('dashboard.upcomingTasksDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dashboardOverview.upcomingTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('dashboard.noUpcomingTasks')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardOverview.upcomingTasks.map((task) => (
                            <div
                              key={task._id}
                              className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => navigate(`/project/${task.projectId}?taskId=${task._id}`)}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.projectName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString()
                                    : "No due date"}
                                </p>
                                {task.assigneeName && (
                                  <p className="text-xs text-muted-foreground">
                                    {task.assigneeName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t('dashboard.recentActivity')}
                      </CardTitle>
                      <CardDescription>
                        {t('dashboard.recentActivityDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dashboardOverview.recentActivity.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('dashboard.noRecentActivity')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardOverview.recentActivity.map((activity) => (
                            <div
                              key={activity._id}
                              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-medium">{activity.userName}</span>{" "}
                                  {activity.action}{" "}
                                  {activity.taskTitle && (
                                    <span className="font-medium">{activity.taskTitle}</span>
                                  )}
                                </p>
                                {activity.projectName && (
                                  <p className="text-xs text-muted-foreground">
                                    {activity.projectName}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity._creationTime).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      case "users":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('users.title')}</h2>
                <p className="text-muted-foreground">
                  {t('users.description')}
                </p>
              </div>
              {canCreateUsers && (
                <Button onClick={() => setIsCreateUserDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('users.addUser')}
                </Button>
              )}
            </div>

            <div className="flex items-center py-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('users.searchUsers')}
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-8"
                />
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
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive">{t('users.blocked')}</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{t('users.active')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user._creationTime ? new Date(user._creationTime).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('users.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('users.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleBlock(user._id, user.isBlocked || false)}>
                              {user.isBlocked ? (
                                <>
                                  <Unlock className="mr-2 h-4 w-4" />
                                  {t('users.unblock')}
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-2 h-4 w-4" />
                                  {t('users.block')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setUserToDelete(user._id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('users.delete')}
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
      case "tasks":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('tasks.myTasks')}</h2>
              <p className="text-muted-foreground">
                {t('tasks.projectTasksDesc')}
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4 flex-wrap">
                  <Select value={taskAssigneeFilter} onValueChange={(value) => setTaskAssigneeFilter(value as "all" | "me")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('tasks.assignedTo')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('tasks.allTasks')}</SelectItem>
                      <SelectItem value="me">{t('tasks.assignedToMe')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={taskProjectFilter} onValueChange={setTaskProjectFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('tasks.project')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('tasks.allProjects')}</SelectItem>
                      {taskProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={taskPriorityFilter} onValueChange={(value) => setTaskPriorityFilter(value as "all" | "urgent" | "high" | "medium" | "low")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('tasks.priority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
                      <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
                      <SelectItem value="high">{t('tasks.high')}</SelectItem>
                      <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                      <SelectItem value="low">{t('tasks.low')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={taskStatusFilter} onValueChange={(value) => setTaskStatusFilter(value as "all" | "active" | "todo" | "in-progress" | "review" | "done" | "blocked")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('tasks.statusFilter')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('tasks.activeTasks')}</SelectItem>
                      <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
                      <SelectItem value="todo">{t('tasks.toDo')}</SelectItem>
                      <SelectItem value="in-progress">{t('tasks.inProgress')}</SelectItem>
                      <SelectItem value="review">{t('tasks.review')}</SelectItem>
                      <SelectItem value="done">{t('tasks.done')}</SelectItem>
                      <SelectItem value="blocked">{t('tasks.blocked')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={taskSortBy} onValueChange={(value) => setTaskSortBy(value as "dueDate" | "priority")}>
                    <SelectTrigger className="w-[180px]">
                      <span>{t('tasks.sortBy')}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">{t('tasks.dueDate')}</SelectItem>
                      <SelectItem value="priority">{t('tasks.priority')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTasks && filteredTasks.length > 0 ? (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => {
                      // Check if task is overdue
                      const isOverdue = task.dueDate &&
                        task.status !== 'done' &&
                        new Date(task.dueDate) < new Date();

                      return (
                        <div
                          key={task._id}
                          className={`flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${isOverdue ? 'border-red-300 bg-red-50/50' : ''
                            }`}
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              {isOverdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {t('tasks.overdue')}
                                </Badge>
                              )}
                              <Badge variant={
                                task.priority === "urgent" ? "destructive" :
                                  task.priority === "high" ? "default" :
                                    task.priority === "medium" ? "secondary" :
                                      "outline"
                              }>
                                {task.priority === "urgent" ? t('tasks.urgent') :
                                  task.priority === "high" ? t('tasks.high') :
                                    task.priority === "medium" ? t('tasks.medium') :
                                      task.priority === "low" ? t('tasks.low') :
                                        task.priority}
                              </Badge>
                              <Badge variant="outline">{task.status}</Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                <span>{task.workgroupName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FolderKanban className="h-3 w-3" />
                                <span>{task.projectName}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/project/${task.projectId}?taskId=${task._id}`)}
                          >
                            {t('tasks.viewTask')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('tasks.noTasksAssigned')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "teams":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('teams.title')}</h2>
                <p className="text-muted-foreground">
                  {t('teams.description')}
                </p>
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
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">{t('teams.noTeams')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('teams.createTeamDesc')}
                  </p>
                  {canCreateTeams && (
                    <Button onClick={() => setIsCreateTeamDialogOpen(true)}>
                      {t('teams.createTeam')}
                    </Button>
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
                          <CardDescription className="mt-1">
                            {team.description || "No description"}
                          </CardDescription>
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
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteTeamDialog(team._id)}
                                >
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
                            <Users className="h-4 w-4" />
                            {t('teams.members')} ({team.memberCount})
                          </h4>
                          <ScrollArea className="h-[120px] w-full rounded-md border p-2">
                            {team.members && team.members.length > 0 ? (
                              <div className="space-y-2">
                                {team.members.map((member: any) => (
                                  <div
                                    key={member._id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={member.imageUrl ?? undefined}
                                          alt={member.name || "Member"}
                                          className="object-cover"
                                        />
                                        <AvatarFallback>
                                          {(member.name?.charAt(0) || "M").toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{member.name}</span>
                                    </div>
                                    {canEditTeams && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemoveTeamMember(team._id, member._id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                No members yet
                              </p>
                            )}
                          </ScrollArea>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created by {team.creatorName}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case "invites":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('invites.title')}</h2>
              <p className="text-muted-foreground">
                {t('invites.description')}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('invites.sendInvite')}</CardTitle>
                <CardDescription>
                  {t('invites.sendInviteDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">{t('invites.fullName')}</Label>
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder={t('invites.fullNamePlaceholder')}
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">{t('invites.email')}</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder={t('invites.emailPlaceholder')}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-workspace">{t('invites.workspace')}</Label>
                    <Select value={inviteWorkgroupId || ""} onValueChange={(value) => setInviteWorkgroupId(value as Id<"workgroups">)}>
                      <SelectTrigger id="invite-workspace">
                        <SelectValue placeholder={t('invites.selectWorkspace')} />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map((workspace) => (
                          <SelectItem key={workspace._id} value={workspace._id}>
                            {workspace.name}
                          </SelectItem>
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
                <CardDescription>
                  {t('invites.pendingInvitesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!invites || invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('invites.noPendingInvites')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {workspaces.find(w => w._id === invite.workgroupId)?.name || t('invites.unknown')} • {invite.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('invites.sent')} {new Date(invite._creationTime).toLocaleDateString()}
                          </p>
                        </div>
                        {invite.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvite(invite._id)}
                            disabled={cancellingInviteId === invite._id}
                          >
                            {cancellingInviteId === invite._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t('invites.cancel')
                            )}
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
      case "reminders":
        return (
          <div className="p-6 w-full space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('reminders.title')}</h2>
                <p className="text-muted-foreground">
                  {t('reminders.description')}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('reminders.reminderSettings')}</CardTitle>
                <CardDescription>
                  {t('reminders.reminderSettingsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>{t('reminders.enableReminders')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('reminders.enableRemindersDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={currentWorkspaceSettings?.enabled ?? false}
                    onCheckedChange={(checked) => handleUpdateReminderSettings("enabled", checked)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>{t('reminders.includeOverdue')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('reminders.includeOverdueDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={currentWorkspaceSettings?.includeOverdue ?? false}
                    onCheckedChange={(checked) => handleUpdateReminderSettings("includeOverdue", checked)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>{t('reminders.notifyProjectChanges')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('reminders.notifyProjectChangesDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={currentWorkspaceSettings?.notifyOnProjectChanges ?? false}
                    onCheckedChange={(checked) => handleUpdateReminderSettings("notifyOnProjectChanges", checked)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('reminders.testEmailService')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('reminders.testEmailServiceDesc')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestEmail}
                      disabled={sendingTestEmail}
                    >
                      {sendingTestEmail ? t('reminders.sending') : t('reminders.sendTest')}
                    </Button>
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
      case "profile":
        return <ProfileSection />;
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('navigation.settings')}</h2>
              <p className="text-muted-foreground">
                {t('settings.description')}
              </p>
            </div>

            <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as "companies" | "permissions")}>
              <TabsList>
                <TabsTrigger value="companies">{t('company.title')}</TabsTrigger>
                <TabsTrigger value="permissions">{t('permissions.title')}</TabsTrigger>
              </TabsList>

              <TabsContent value="companies" className="mt-6">
                <CompanySection />
              </TabsContent>

              <TabsContent value="permissions" className="mt-6">
                {/* Permissions content - moved from case "permissions" */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{t('permissions.title')}</h3>
                      <p className="text-muted-foreground">
                        {t('permissions.description')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(t('permissions.resetConfirm'))
                        ) {
                          resetPermissions({});
                          toast.success("Permissões resetadas com sucesso");
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
                                <Badge variant="outline" className="text-xs">
                                  {t('permissions.readOnly')}
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {isOwner
                                ? t('permissions.ownerDesc')
                                : `${t('permissions.roleDesc')} ${t(`roles.${roleKey}`).toLowerCase()}.`
                              }
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
                                  const perms = rolePermissions?.[role]?.[area] || {
                                    view: false,
                                    create: false,
                                    edit: false,
                                    delete: false,
                                  };

                                  return (
                                    <TableRow key={area}>
                                      <TableCell className="font-medium capitalize">
                                        {area.replace("_", " ")}
                                      </TableCell>
                                      {["view", "create", "edit", "delete"].map(
                                        (action) => (
                                          <TableCell key={action} className="text-center">
                                            <Switch
                                              checked={
                                                isOwner ? true : perms[action as keyof typeof perms]
                                              }
                                              disabled={isOwner}
                                              onCheckedChange={(checked) =>
                                                handleUpdatePermission(
                                                  role,
                                                  area,
                                                  action,
                                                  checked
                                                )
                                              }
                                            />
                                          </TableCell>
                                        )
                                      )}
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
      case "projects":
        return <ProjectsSection />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="ProjecTrak" className="h-8 w-8" />
              <div className="flex-1">
                <h2 className="font-bold text-lg">ProjecTrak</h2>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Sidebar Navigation */}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentSection === "dashboard"}
                  onClick={() => {
                    setCurrentSection("dashboard");
                    setSelectedWorkgroupId(null);
                  }}
                >
                  <Home className="h-4 w-4" />
                  <span>{t('navigation.dashboard')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canViewPermissions && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={currentSection === "settings"}
                    onClick={() => {
                      setSelectedWorkgroupId(null);
                      setCurrentSection("settings");
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('navigation.settings')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canViewUsers && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={currentSection === "users"}
                    onClick={() => setCurrentSection("users")}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t('navigation.users')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canViewTeams && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={currentSection === "teams"}
                    onClick={() => setCurrentSection("teams")}
                  >
                    <Users className="h-4 w-4" />
                    <span>{t('navigation.teams')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentSection === "reminders"}
                  onClick={() => setCurrentSection("reminders")}
                >
                  <Bell className="h-4 w-4" />
                  <span>{t('reminders.title')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentSection === "invites"}
                  onClick={() => setCurrentSection("invites")}
                >
                  <Mail className="h-4 w-4" />
                  <span>{t('invites.title')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentSection === "profile"}
                  onClick={() => {
                    setSelectedWorkgroupId(null);
                    setCurrentSection("profile");
                  }}
                >
                  <User className="h-4 w-4" />
                  <span>{t('profile.title')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentSection === "projects"}
                  onClick={() => {
                    setSelectedWorkgroupId(null);
                    setCurrentSection("projects");
                  }}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>{t('projects.summary')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <Separator className="my-2" />

            {/* Talks */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setCurrentSection("tasks");
                        setSelectedWorkgroupId(null);
                      }}
                      isActive={currentSection === "tasks"}
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>{t('common.tasks')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="my-2" />

            {/* Workspaces */}
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                <span>{t('dashboard.workspaces')}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {!workspaces ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      {t('dashboard.noWorkspacesYet')}
                    </div>
                  ) : (
                    workspaces.map((workgroup) => (
                      <SidebarMenuItem key={workgroup._id}>
                        <div className="flex items-center w-full group">
                          <SidebarMenuButton
                            onClick={() => {
                              navigate(`/workgroup/${workgroup._id}`);
                            }}
                            isActive={selectedWorkgroupId === workgroup._id}
                            className="flex-1"
                          >
                            <FolderKanban className="h-4 w-4" />
                            <span>{workgroup.name}</span>
                          </SidebarMenuButton>
                          {workgroup.ownerId === currentUser?._id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWorkspaceSettings(workgroup);
                              }}
                              title={t('dashboard.workspaceSettings')}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteWorkspaces && (currentUser?.role === "owner" || workgroup.ownerId === currentUser?._id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteWorkspaceDialog(workgroup._id);
                              }}
                              title={t('dashboard.deleteWorkspace')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Projects (shown when workspace selected) */}
            {selectedWorkgroupId && (
              <>
                <Separator className="my-2" />
                <SidebarGroup>
                  <SidebarGroupLabel>{t('common.projects')}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {!selectedWorkgroupProjects ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : filteredProjects && filteredProjects.length === 0 ? (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                          {t('common.noProjectsYet')}
                        </div>
                      ) : (
                        selectedWorkgroupProjects.map((project) => (
                          <SidebarMenuItem key={project._id}>
                            <SidebarMenuButton
                              onClick={() => navigate(`/project/${project._id}`)}
                            >
                              <Briefcase className="h-4 w-4" />
                              <span>{project.name}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.signOut')}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">
              {currentSection === "users" ? t('users.title') :
                currentSection === "teams" ? t('teams.title') :
                  currentSection === "permissions" ? t('permissions.title') :
                    currentSection === "reminders" ? t('reminders.title') :
                      currentSection === "invites" ? t('invites.title') :
                        currentSection === "profile" ? t('profile.title') :
                          currentSection === "company" ? t('company.title') :
                            currentSection === "tasks" ? t('common.tasks') :
                              currentSection === "projects" ? t('projects.title') :
                                "Dashboard"}
            </h1>
            {currentUser && (
              <div className="ml-auto flex items-center gap-3">
                {/* Language Selector */}
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇧🇷</span>
                        <span>Português</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇺🇸</span>
                        <span>English</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="es">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇪🇸</span>
                        <span>Español</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-right leading-tight">
                  <p className="text-sm font-semibold">
                    {currentUser.name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
                <Avatar className="h-10 w-10 border border-border" key={`${currentUser._id}-header`}>
                  <AvatarImage
                    key={currentUser.imageUrl ?? currentUser.image ?? "no-image"}
                    src={currentUser.imageUrl ?? currentUser.image ?? undefined}
                    alt={currentUser.name || "User"}
                  />
                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </header>

          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.createUser')}</DialogTitle>
            <DialogDescription>
              {t('users.createUserDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="new-user-name">{t('users.name')}</Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-user-email">{t('users.email')}</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-user-role">{t('users.userRole')}</Label>
              <Select
                value={newUserRole}
                onValueChange={(value) => setNewUserRole(value as "owner" | "manager" | "collaborator" | "reader")}
              >
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('roles.owner')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                  <SelectItem value="collaborator">{t('roles.collaborator')}</SelectItem>
                  <SelectItem value="reader">{t('roles.reader')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('users.createUser')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
            <DialogDescription>
              {t('users.editUserDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div>
              <Label htmlFor="edit-user-name">{t('users.name')}</Label>
              <Input
                id="edit-user-name"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-user-email">{t('users.email')}</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-user-role">{t('users.userRole')}</Label>
              <Select
                value={editUserRole}
                onValueChange={(value) => setEditUserRole(value as "owner" | "manager" | "collaborator" | "reader")}
              >
                <SelectTrigger id="edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('roles.owner')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                  <SelectItem value="collaborator">{t('roles.collaborator')}</SelectItem>
                  <SelectItem value="reader">{t('roles.reader')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditUserDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isEditingUser}>
                {isEditingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteUserDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('users.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User to Workspace Dialog */}
      <Dialog open={isAddToWorkspaceDialogOpen} onOpenChange={setIsAddToWorkspaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Workspace</DialogTitle>
            <DialogDescription>
              Select a workspace and role for this user
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddToWorkspace} className="space-y-4">
            <div>
              <Label htmlFor="workspace-select">Workspace</Label>
              <Select
                value={selectedWorkspaceForAdd || ""}
                onValueChange={(value) => setSelectedWorkspaceForAdd(value as Id<"workgroups">)}
              >
                <SelectTrigger id="workspace-select">
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workgroups?.map((wg) => (
                    <SelectItem key={wg._id} value={wg._id}>
                      {wg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role-select">Role</Label>
              <Select
                value={selectedRoleForAdd}
                onValueChange={(value) => setSelectedRoleForAdd(value as "owner" | "manager" | "collaborator" | "reader")}
              >
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="collaborator">Collaborator</SelectItem>
                  <SelectItem value="reader">Reader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddToWorkspaceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingToWorkspace || !selectedWorkspaceForAdd}>
                {isAddingToWorkspace && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Workspace
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Projeto</DialogTitle>
            <DialogDescription>
              Criar um novo projeto em {selectedWorkgroup?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Redesign do Website"
                required
              />
            </div>
            <div>
              <Label htmlFor="project-description">Descrição</Label>
              <Textarea
                id="project-description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Redesenhar o site da empresa com UI moderna"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="project-manager">Gerente do Projeto *</Label>
              <Select
                value={projectManagerId || ""}
                onValueChange={(value) => setProjectManagerId(value as Id<"users">)}
                required
              >
                <SelectTrigger id="project-manager">
                  <SelectValue placeholder="Selecione um gerente" />
                </SelectTrigger>
                <SelectContent>
                  {availableManagers.length > 0 ? (
                    availableManagers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {projectTeamRestricted && projectAllowedTeamIds.length > 0
                        ? "Nenhum usuário encontrado nas equipes selecionadas"
                        : "Nenhum usuário disponível"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Team Access Control */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Restringir Acesso por Equipe</Label>
                  <p className="text-sm text-muted-foreground">
                    Limitar o acesso ao projeto apenas para membros de equipes específicas
                  </p>
                </div>
                <Switch
                  checked={projectTeamRestricted}
                  onCheckedChange={setProjectTeamRestricted}
                />
              </div>

              {projectTeamRestricted && (
                <div className="space-y-2">
                  <Label>Equipes Permitidas</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {teams && teams.length > 0 ? (
                      teams.map((team) => (
                        <div key={team._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`team-${team._id}`}
                            checked={projectAllowedTeamIds.includes(team._id)}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setProjectAllowedTeamIds([...projectAllowedTeamIds, team._id]);
                              } else {
                                setProjectAllowedTeamIds(
                                  projectAllowedTeamIds.filter((id) => id !== team._id)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`team-${team._id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {team.name}
                            <span className="text-muted-foreground ml-2">
                              ({team.memberCount} {team.memberCount === 1 ? "membro" : "membros"})
                            </span>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma equipe disponível. Crie equipes primeiro.
                      </p>
                    )}
                  </div>
                  {projectTeamRestricted && projectAllowedTeamIds.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Selecione pelo menos uma equipe para restringir o acesso
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateProjectDialogOpen(false);
                  setProjectTeamRestricted(false);
                  setProjectAllowedTeamIds([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingProject || (projectTeamRestricted && projectAllowedTeamIds.length === 0)}
              >
                {isCreatingProject && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.createWorkspace')}</DialogTitle>
            <DialogDescription>
              {t('common.createWorkspaceDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkgroup} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={workgroupName}
                onChange={(e) => setWorkgroupName(e.target.value)}
                placeholder="Engineering Team"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={workgroupDescription}
                onChange={(e) => setWorkgroupDescription(e.target.value)}
                placeholder="Team working on core product features"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-2">
                You will be automatically set as the owner of this workspace
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('teams.createNewTeam')}</DialogTitle>
            <DialogDescription>
              {t('teams.createTeamDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <Label htmlFor="team-name">{t('teams.teamName')}</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Development Team"
                required
              />
            </div>
            <div>
              <Label htmlFor="team-description">{t('tasks.description')}</Label>
              <Textarea
                id="team-description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Team responsible for product development"
                rows={3}
              />
            </div>
            <div>
              <Label>{t('teams.addMember')} (Optional)</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  const userId = value as Id<"users">;
                  if (!selectedTeamMembers.includes(userId)) {
                    setSelectedTeamMembers([...selectedTeamMembers, userId]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('teams.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeamMembers.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedTeamMembers.map((userId) => {
                    const user = allUsers?.find((u) => u._id === userId);
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm">{user?.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setSelectedTeamMembers(
                              selectedTeamMembers.filter((id) => id !== userId)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateTeamDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isCreatingTeam}>
                {isCreatingTeam && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('teams.createTeam')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('teams.editTeam')}</DialogTitle>
            <DialogDescription>{t('teams.editTeamDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTeam} className="space-y-4">
            <div>
              <Label htmlFor="edit-team-name">{t('teams.teamName')}</Label>
              <Input
                id="edit-team-name"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-team-description">{t('tasks.description')}</Label>
              <Textarea
                id="edit-team-description"
                value={editTeamDescription}
                onChange={(e) => setEditTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTeamDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isEditingTeam}>
                {isEditingTeam && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <AlertDialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teams.deleteTeam')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teams.deleteTeamDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('teams.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddTeamMemberDialogOpen} onOpenChange={setIsAddTeamMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a user to add to the team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeamMember} className="space-y-4">
            <div>
              <Label>Select User</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedUserForTeam || ""}
                onChange={(e) => setSelectedUserForTeam(e.target.value as Id<"users">)}
              >
                <option value="" disabled>Select a user</option>
                {allUsers?.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTeamMemberDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedUserForTeam}>
                Add Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={isDeleteWorkspaceDialogOpen} onOpenChange={setIsDeleteWorkspaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workspace,
              all its projects, tasks, and associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Team Invite</DialogTitle>
            <DialogDescription>
              Invite a new member to join your team. They will be registered as a Collaborator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-workgroup">Workgroup</Label>
              <Select
                value={inviteWorkgroupId || ""}
                onValueChange={(value) => setInviteWorkgroupId(value as Id<"workgroups">)}
              >
                <SelectTrigger id="invite-workgroup">
                  <SelectValue placeholder="Select a workgroup" />
                </SelectTrigger>
                <SelectContent>
                  {dashboardOverview?.workgroups?.map((workgroup: any) => (
                    <SelectItem key={workgroup._id} value={workgroup._id}>
                      {workgroup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                placeholder="Enter full name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={isSendingInvite}>
              {isSendingInvite ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workspace Settings Dialog */}
      <Dialog
        open={isWorkspaceSettingsDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeWorkspaceSettings();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações do workspace</DialogTitle>
            <DialogDescription>
              {workspaceForSettings ? `Gerencie os membros de ${workspaceForSettings.name}` : "Selecione um workspace para continuar."}
            </DialogDescription>
          </DialogHeader>
          {!workspaceForSettings ? (
            <p className="text-sm text-muted-foreground">Selecione um workspace para gerenciar os membros.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Membros atuais</h4>
                {workspaceMembers === undefined ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : workspaceMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {workspaceMembers.map((member: any) => (
                      <div key={member._id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <p className="text-sm font-medium">{member.userName || "Usuário"}</p>
                          <p className="text-xs text-muted-foreground">{member.userEmail || "Sem e-mail"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {member.role}
                          </Badge>
                          {canManageWorkspaceMembers && member.role !== ROLES.OWNER && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveWorkspaceMember(member._id)}
                              disabled={removingWorkspaceMemberId === member._id}
                            >
                              {removingWorkspaceMemberId === member._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canManageWorkspaceMembers && (
                <div className="space-y-3 border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold">Adicionar Time ao Workspace</h4>
                  <form onSubmit={handleAddTeamToWorkspace} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-team-select">Selecionar Time</Label>
                      <Select value={workspaceTeamId} onValueChange={setWorkspaceTeamId}>
                        <SelectTrigger id="workspace-team-select">
                          <SelectValue placeholder="Selecione um time" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams?.map((team) => (
                            <SelectItem key={team._id} value={team._id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-team-role">Papel do Time</Label>
                      <Select value={workspaceTeamRole} onValueChange={(value: Role) => setWorkspaceTeamRole(value)}>
                        <SelectTrigger id="workspace-team-role">
                          <SelectValue placeholder="Selecione um papel" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ROLES).map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isAddingTeamToWorkspace || !workspaceTeamId}>
                        {isAddingTeamToWorkspace ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adicionando Time
                          </>
                        ) : (
                          "Adicionar Time"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}