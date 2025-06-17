
"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast" // Corrected import path
import { deleteGroup, updateGroup, bulkGroupActions, searchGroups, performGroupAction } from "@/lib/api"
import { ImportDialog } from "@/components/import-dialog"
import { AdvancedFilters } from "@/components/advanced-filters"
import { Pagination } from "@/components/pagination"
import { AddGroupDialog } from "@/components/add-group-dialog"
import {
  Search,
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderKanban,
  Users,
  Shield,
  Upload,
  Filter,
  Download,
  LockKeyhole,
  UnlockKeyhole,
  Activity,
  Power,
  ListFilter,
  FileText,
  Eye,
  PowerOff, 
  CalendarDays,
  X as XIcon,
  AlertTriangle,
  CheckCircle,
  UserX,
} from "lucide-react"
import Link from "next/link"
import { getCoreApiErrorMessage } from "@/lib/utils"


interface Group {
  groupName: string
  authMethod: string
  role: string
  mfa: boolean
  denyAccess: boolean
  accessControl: string[]
  isEnabled?: boolean
  memberCount?: number
  createdAt?: string
}

interface GroupTableRowProps {
  group: Group;
  selectedGroups: string[];
  onSelectGroup: (groupName: string, checked: boolean) => void;
  onUpdateGroupAccess: (groupName: string, deny: boolean) => void;
  onEnableGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
}

const GroupTableRow = memo(({ group, selectedGroups, onSelectGroup, onUpdateGroupAccess, onEnableGroup, onDeleteGroup }: GroupTableRowProps) => {
  const getStatusBadge = () => {
    if (group.isEnabled === false) {
      return <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600"><Activity className="h-3 w-3" />System Disabled</Badge>;
    }
    if (group.denyAccess) {
      return <Badge variant="secondary" className="flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"><LockKeyhole className="h-3 w-3" /> Access Denied</Badge>;
    }
    return <Badge variant="default" className="flex items-center gap-1 bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/30"><UnlockKeyhole className="h-3 w-3" /> Access Allowed</Badge>;
  };

  return (
    <TableRow key={group.groupName} className={selectedGroups.includes(group.groupName) ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50 transition-colors"}>
      <TableCell className="w-12">
        <Checkbox
          checked={selectedGroups.includes(group.groupName)}
          onCheckedChange={(checked) => onSelectGroup(group.groupName, Boolean(checked))}
          aria-label={`Select group ${group.groupName}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <Link href={`/dashboard/groups/${group.groupName}`} className="font-medium text-primary hover:underline">
                {group.groupName}
            </Link>
             <div className="text-xs mt-1">{getStatusBadge()}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{group.authMethod || "N/A"}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant="secondary">{group.role || "N/A"}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
          {group.mfa ? (
            <Badge variant="default" className="text-xs bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-600/30">
              MFA On
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              MFA Off
            </Badge>
          )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {group.accessControl && group.accessControl.length > 0 ? (
          <div className="flex items-center gap-1 text-sm">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            {group.accessControl.length} rules
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No rules</span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {group.memberCount ?? "N/A"}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu for {group.groupName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/groups/${group.groupName}`}>
                <Eye className="mr-2 h-4 w-4" />
                View/Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/users?groupName=${group.groupName}`}>
                <Users className="mr-2 h-4 w-4" />
                View Members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             {group.denyAccess ? (
              <DropdownMenuItem onClick={() => onUpdateGroupAccess(group.groupName, false)} disabled={group.isEnabled === false}>
                <UnlockKeyhole className="mr-2 h-4 w-4 text-green-600" />
                Allow VPN Access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdateGroupAccess(group.groupName, true)} disabled={group.isEnabled === false}>
                <LockKeyhole className="mr-2 h-4 w-4 text-red-600" />
                Deny VPN Access
              </DropdownMenuItem>
            )}
            {group.isEnabled === false && (
              <DropdownMenuItem onClick={() => onEnableGroup(group.groupName)}>
                <Power className="mr-2 h-4 w-4 text-green-600" />
                Enable Group
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteGroup(group.groupName)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
});
GroupTableRow.displayName = "GroupTableRow";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)

  const [groupToUpdateAccess, setGroupToUpdateAccess] = useState<{ groupName: string; deny: boolean } | null>(null);
  const [isConfirmSingleAccessDialogOpen, setIsConfirmSingleAccessDialogOpen] = useState(false);

  const [groupToEnable, setGroupToEnable] = useState<string | null>(null);
  const [isConfirmSingleEnableDialogOpen, setIsConfirmSingleEnableDialogOpen] = useState(false);

  const [bulkAccessActionToConfirm, setBulkAccessActionToConfirm] = useState<"allow" | "deny" | null>(null);
  const [isConfirmBulkAccessDialogOpen, setIsConfirmBulkAccessDialogOpen] = useState(false);
  
  const [bulkActionToConfirm, setBulkActionToConfirm] = useState<"enable" | null>(null); 
  const [isConfirmBulkActionDialogOpen, setIsConfirmBulkActionDialogOpen] = useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
    
  const [currentFilters, setCurrentFilters] = useState<any>({
    sortBy: "groupName",
    sortOrder: "asc",
    includeMemberCount: true,
  })
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const { toast } = useToast()
  const searchParams = useSearchParams()
  const actionQueryParam = searchParams.get("action")
  const groupNameQueryParam = searchParams.get("groupName")


  const fetchGroupsCallback = useCallback(async (filtersToApply: any) => {
    try {
      setLoading(true);
      const criteriaForSearch: any = {
        page,
        limit,
        sortBy: filtersToApply.sortBy || "groupName",
        sortOrder: filtersToApply.sortOrder || "asc",
        includeMemberCount: true,
      };

      if (searchTerm.trim()) {
        criteriaForSearch.searchText = searchTerm.trim();
      }
      
      for (const key in filtersToApply) {
        if (key !== 'sortBy' && key !== 'sortOrder' && key !== 'includeMemberCount' && filtersToApply[key] !== undefined && filtersToApply[key] !== "" && filtersToApply[key] !== "any") {
          criteriaForSearch[key] = filtersToApply[key];
        }
      }

      if (criteriaForSearch.isEnabled !== undefined && criteriaForSearch.isEnabled !== "any") {
        criteriaForSearch.isEnabled = criteriaForSearch.isEnabled === 'true';
      } else {
        delete criteriaForSearch.isEnabled;
      }
      if (criteriaForSearch.hasMFA !== undefined && criteriaForSearch.hasMFA !== "any") {
        criteriaForSearch.hasMFA = criteriaForSearch.hasMFA === 'true';
      } else {
        delete criteriaForSearch.hasMFA;
      }
      if (criteriaForSearch.denyAccess !== undefined && criteriaForSearch.denyAccess !== "any") {
        criteriaForSearch.denyAccess = criteriaForSearch.denyAccess === 'true';
      } else {
        delete criteriaForSearch.denyAccess;
      }

      const data = await searchGroups(criteriaForSearch);
      setGroups(data.groups?.map((g: any) => ({ ...g, denyAccess: g.denyAccess ?? false, isEnabled: typeof g.isEnabled === 'boolean' ? g.isEnabled : true })) || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast({
        title: "Error Fetching Groups",
        description: getCoreApiErrorMessage(error.message) || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      setGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm, toast]);

  useEffect(() => {
    if (actionQueryParam === "new" && !isAddGroupDialogOpen) {
      setIsAddGroupDialogOpen(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("action");
      window.history.replaceState({}, "", newUrl.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionQueryParam, isAddGroupDialogOpen]);

  useEffect(() => {
    let initialFiltersVal = { ...currentFilters };
    if (groupNameQueryParam) {
        initialFiltersVal = { ...initialFiltersVal, groupName: groupNameQueryParam };
        if (!showFilters) setShowFilters(true); 
    }
    setCurrentFilters(initialFiltersVal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNameQueryParam]);


  useEffect(() => {
    const handler = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchGroupsCallback(currentFilters);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, currentFilters]); 
  
  useEffect(() => { 
    fetchGroupsCallback(currentFilters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);


  const handleFiltersChangeCallback = useCallback((newFilters: any) => {
    const filtersWithInclude = {
      ...newFilters,
      includeMemberCount: true
    };
    setCurrentFilters(filtersWithInclude);
    if (page !== 1) setPage(1);
    else fetchGroupsCallback(filtersWithInclude);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchGroupsCallback]);


  const handleDeleteGroupCallback = useCallback(async () => {
    if (!groupToDelete) return

    try {
      await deleteGroup(groupToDelete)
      toast({
        title: "Success",
        description: `Group ${groupToDelete} has been deleted.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      fetchGroupsCallback(currentFilters)
      setSelectedGroups(prev => prev.filter(g => g !== groupToDelete));
    } catch (error: any) {
      toast({
        title: "Error Deleting Group",
        description: getCoreApiErrorMessage(error.message) || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setGroupToDelete(null)
      setIsDeleteGroupDialogOpen(false)
    }
  }, [groupToDelete, fetchGroupsCallback, toast, currentFilters]);

  const confirmDeleteGroup = useCallback((groupName: string) => {
    setGroupToDelete(groupName);
    setIsDeleteGroupDialogOpen(true);
  }, []);

  const confirmUpdateGroupAccess = useCallback((groupName: string, deny: boolean) => {
    setGroupToUpdateAccess({ groupName, deny });
    setIsConfirmSingleAccessDialogOpen(true);
  }, []);

  const executeUpdateGroupAccess = useCallback(async () => {
    if (!groupToUpdateAccess) return;
    const { groupName, deny } = groupToUpdateAccess;
    try {
      await updateGroup(groupName, { denyAccess: deny });
      toast({
        title: "Success",
        description: `VPN access for group ${groupName} has been ${deny ? "denied" : "allowed"}.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
      fetchGroupsCallback(currentFilters);
    } catch (error: any) {
      toast({
        title: "Error Updating VPN Access",
        description: getCoreApiErrorMessage(error.message) || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setIsConfirmSingleAccessDialogOpen(false);
      setGroupToUpdateAccess(null);
    }
  }, [groupToUpdateAccess, fetchGroupsCallback, toast, currentFilters]);

  const confirmEnableGroup = useCallback((groupName: string) => {
    setGroupToEnable(groupName);
    setIsConfirmSingleEnableDialogOpen(true);
  }, []);

  const executeEnableGroup = useCallback(async () => {
    if (!groupToEnable) return;
    try {
      await performGroupAction(groupToEnable, "enable");
      toast({
        title: "Success",
        description: `Group ${groupToEnable} has been enabled.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
      fetchGroupsCallback(currentFilters);
    } catch (error: any) {
      toast({
        title: "Error Enabling Group",
        description: getCoreApiErrorMessage(error.message) || `An unexpected error occurred.`,
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setIsConfirmSingleEnableDialogOpen(false);
      setGroupToEnable(null);
    }
  }, [groupToEnable, fetchGroupsCallback, toast, currentFilters]);


  const confirmBulkUpdateAccess = useCallback((action: "allow" | "deny") => {
    if (selectedGroups.length === 0) {
      toast({ title: "No Groups Selected", description: "Please select groups to perform bulk actions.", variant: "destructive", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    setBulkAccessActionToConfirm(action);
    setIsConfirmBulkAccessDialogOpen(true);
  }, [selectedGroups, toast]);

  const executeBulkUpdateAccess = useCallback(async () => {
    if (!bulkAccessActionToConfirm || selectedGroups.length === 0) return;

    const deny = bulkAccessActionToConfirm === "deny";
    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    toast({ title: "Info", description: `Attempting to ${bulkAccessActionToConfirm} VPN access for ${selectedGroups.length} groups...`, variant: "info"});

    for (const groupName of selectedGroups) {
      try {
        const group = groups.find(g => g.groupName === groupName);
        if (deny && group && group.isEnabled === false) {
            continue;
        }
        await updateGroup(groupName, { denyAccess: deny });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setBulkActionLoading(false);
    setIsConfirmBulkAccessDialogOpen(false);
    setBulkAccessActionToConfirm(null);

    let summaryMessage = `${successCount} groups had VPN access ${deny ? "denied" : "allowed"}.`;
    if (failCount > 0) {
      summaryMessage += ` ${failCount} groups failed to update.`;
    }
    toast({
      title: "Bulk Action Complete",
      description: summaryMessage,
      variant: failCount > 0 && successCount === 0 ? "destructive" : (failCount > 0 ? "warning" : "success"),
      icon: failCount > 0 ? <AlertTriangle className="h-5 w-5"/> : <CheckCircle className="h-5 w-5"/>
    });

    fetchGroupsCallback(currentFilters);
    setSelectedGroups([]);
  }, [bulkAccessActionToConfirm, selectedGroups, fetchGroupsCallback, toast, currentFilters, groups]);
  
  const confirmBulkAction = useCallback((action: "enable") => { 
    if (selectedGroups.length === 0) {
      toast({ title: "No groups selected", description: "Please select groups for this bulk action.", variant: "destructive", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    setBulkActionToConfirm(action);
    setIsConfirmBulkActionDialogOpen(true);
  }, [selectedGroups, toast]);

  const executeBulkAction = useCallback(async () => {
    if (!bulkActionToConfirm || selectedGroups.length === 0) return;

    setBulkActionLoading(true);
    try {
      const result = await bulkGroupActions(selectedGroups, bulkActionToConfirm); 
      toast({
        title: "Success",
        description: `${result.success || 0} groups ${bulkActionToConfirm}d. ${result.failed || 0} failed.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
      fetchGroupsCallback(currentFilters);
      setSelectedGroups([]);
    } catch (error: any) {
      toast({
        title: `Error Bulk ${bulkActionToConfirm.charAt(0).toUpperCase() + bulkActionToConfirm.slice(1)} Groups`,
        description: getCoreApiErrorMessage(error.message) || "An unexpected error occurred.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setBulkActionLoading(false);
      setIsConfirmBulkActionDialogOpen(false);
      setBulkActionToConfirm(null);
    }
  }, [bulkActionToConfirm, selectedGroups, fetchGroupsCallback, toast, currentFilters]);


  const handleSelectGroupCallback = useCallback((groupName: string, checked: boolean) => {
    setSelectedGroups(prev => checked ? [...prev, groupName] : prev.filter(g => g !== groupName));
  }, []);

  const handleSelectAllCallback = useCallback((checked: boolean) => {
    setSelectedGroups(checked ? groups.map(group => group.groupName) : []);
  }, [groups]);


  const handleExport = useCallback(() => {
    toast({
      title: "Export Coming Soon",
      description: "This feature will be available in a future update.",
      variant: "info"
    })
  }, [toast]);

  const totalPages = Math.ceil(total / limit)
  const isAllSelected = groups.length > 0 && selectedGroups.length === groups.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Group Management</h1>
            <p className="text-muted-foreground mt-1">Manage OpenVPN user groups and their access settings.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddGroupDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
             <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by group name..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 h-10 w-full sm:w-auto">
              <ListFilter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"} ({Object.values(currentFilters).filter(v => v && v !== "any" && v !== "groupName" && v !== "asc" && v !== true && v !== undefined).length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showFilters && (
            <div className="p-4 sm:p-6 border-b bg-muted/30">
              <AdvancedFilters type="groups" onFiltersChange={handleFiltersChangeCallback} initialFilters={currentFilters} />
            </div>
          )}

          {selectedGroups.length > 0 && (
            <div className="p-3 sm:p-4 border-b bg-primary/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{selectedGroups.length} group(s) selected</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => confirmBulkAction("enable")} disabled={bulkActionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                          <Power className="mr-2 h-4 w-4" /> Enable
                        </Button>
                        {/* Disable Group button removed */}
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("allow")} disabled={bulkActionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                          <UnlockKeyhole className="mr-2 h-4 w-4" /> Allow Access
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("deny")} disabled={bulkActionLoading} className="border-red-500 text-red-700 hover:bg-red-500/10">
                          <LockKeyhole className="mr-2 h-4 w-4" /> Deny Access
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedGroups([])} disabled={bulkActionLoading}>
                          Clear
                        </Button>
                    </div>
                </div>
            </div>
           )}

          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAllCallback}
                          disabled={groups.length === 0}
                          aria-label="Select all groups"
                        />
                      </TableHead>
                      <TableHead>Group (Status)</TableHead>
                      <TableHead className="hidden md:table-cell">Auth Method</TableHead>
                      <TableHead className="hidden lg:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">MFA</TableHead>
                      <TableHead className="hidden lg:table-cell">Access Control</TableHead>
                      <TableHead className="hidden sm:table-cell">Members</TableHead>
                      <TableHead className="text-right px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <FileText className="mx-auto h-10 w-10 opacity-50 mb-2" />
                          No groups found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((group) => (
                        <GroupTableRow
                          key={group.groupName}
                          group={group}
                          selectedGroups={selectedGroups}
                          onSelectGroup={handleSelectGroupCallback}
                          onUpdateGroupAccess={confirmUpdateGroupAccess}
                          onEnableGroup={confirmEnableGroup}
                          onDeleteGroup={confirmDeleteGroup}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => {
                  setLimit(newLimit)
                  setPage(1)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete group "{groupToDelete}"? This action cannot be undone and may affect users in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteGroupDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteGroupCallback}>
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmSingleAccessDialogOpen} onOpenChange={setIsConfirmSingleAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {groupToUpdateAccess?.deny ? "deny" : "allow"} VPN access for group "{groupToUpdateAccess?.groupName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSingleAccessDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUpdateGroupAccess}
              className={groupToUpdateAccess?.deny ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
            >
              Confirm {groupToUpdateAccess?.deny ? "Deny Access" : "Allow Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmSingleEnableDialogOpen} onOpenChange={setIsConfirmSingleEnableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Enable Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to enable group "{groupToEnable}"? This will allow users in this group to connect if they are not individually denied access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSingleEnableDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeEnableGroup}
              className={"bg-primary hover:bg-primary/90"}
            >
              Confirm Enable Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmBulkAccessDialogOpen} onOpenChange={setIsConfirmBulkAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAccessActionToConfirm === "deny" ? "deny" : "allow"} VPN access for {selectedGroups.length} selected group(s)?
              {bulkAccessActionToConfirm === "deny" && selectedGroups.some(sg => groups.find(g => g.groupName === sg && g.isEnabled === false)) && (
                 <p className="text-yellow-600 text-sm mt-2">Warning: Some selected groups are system disabled. Denying access might be redundant until they are enabled.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkAccessDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkUpdateAccess}
              disabled={bulkActionLoading}
              className={bulkAccessActionToConfirm === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkAccessActionToConfirm === "deny" ? "Deny Access" : "Allow Access"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmBulkActionDialogOpen} onOpenChange={setIsConfirmBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Group Action: {bulkActionToConfirm?.charAt(0).toUpperCase() + (bulkActionToConfirm || "").slice(1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkActionToConfirm} the {selectedGroups.length} selected group(s)? This will apply system-wide.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkActionDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              disabled={bulkActionLoading}
              className={bulkActionToConfirm === 'enable' ? "bg-primary hover:bg-primary/90" : "bg-yellow-500 hover:bg-yellow-500/90 text-white" }
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkActionToConfirm?.charAt(0).toUpperCase() + (bulkActionToConfirm || "").slice(1)} Groups`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        type="groups"
        onImportComplete={() => fetchGroupsCallback(currentFilters)}
      />

      <AddGroupDialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen} onSuccess={() => fetchGroupsCallback(currentFilters)} />
    </div>
  )
}

    