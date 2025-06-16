
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
import { useToast } from "@/components/ui/use-toast"
import { deleteGroup, updateGroup, bulkGroupActions, searchGroups } from "@/lib/api" // Changed performGroupAction to updateGroup
import { ImportDialog } from "@/components/import-dialog"
import { AdvancedFilters } from "@/components/advanced-filters"
import { Pagination } from "@/components/pagination"
import { AddGroupDialog } from "@/components/add-group-dialog"
import {
  Search,
  Plus,
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
} from "lucide-react"
import Link from "next/link"

interface Group {
  groupName: string
  authMethod: string
  role: string
  mfa: boolean
  denyAccess: boolean
  accessControl: string[]
  isEnabled?: boolean // EnhancedGroupResponse has this
  memberCount?: number
  createdAt?: string
}

interface GroupTableRowProps {
  group: Group;
  selectedGroups: string[];
  onSelectGroup: (groupName: string, checked: boolean) => void;
  onUpdateGroupAccess: (groupName: string, deny: boolean) => void; // Changed from onGroupAction
  onDeleteGroup: (groupName: string) => void;
}

const GroupTableRow = memo(({ group, selectedGroups, onSelectGroup, onUpdateGroupAccess, onDeleteGroup }: GroupTableRowProps) => {
  const getStatusBadge = () => {
    if (group.isEnabled === false) {
      return <Badge variant="outline" className="flex items-center gap-1 text-yellow-700 border-yellow-500 dark:text-yellow-300"><Activity className="h-3 w-3" />System Disabled</Badge>;
    }
    if (group.denyAccess) {
      return <Badge variant="secondary" className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Access Denied</Badge>;
    }
    return <Badge variant="default" className="flex items-center gap-1"><UnlockKeyhole className="h-3 w-3" /> Access Allowed</Badge>;
  };
  
  return (
    <TableRow key={group.groupName} className={selectedGroups.includes(group.groupName) ? "bg-muted/60" : "hover:bg-muted/50"}>
      <TableCell>
        <Checkbox
          checked={selectedGroups.includes(group.groupName)}
          onCheckedChange={(checked) => onSelectGroup(group.groupName, Boolean(checked))}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <div>
            <Link href={`/dashboard/groups/${group.groupName}`} className="font-medium hover:underline">
                {group.groupName}
            </Link>
             <div className="text-xs mt-1">{getStatusBadge()}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{group.authMethod || "N/A"}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{group.role || "N/A"}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {group.mfa ? (
            <Badge variant="default" className="text-xs">
              MFA Required
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              No MFA
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {group.accessControl && group.accessControl.length > 0 ? (
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{group.accessControl.length} rules</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{group.memberCount ?? "N/A"}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/groups/${group.groupName}`}>
                <Edit className="mr-2 h-4 w-4" />
                View/Edit
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
              <DropdownMenuItem onClick={() => onUpdateGroupAccess(group.groupName, false)}>
                <UnlockKeyhole className="mr-2 h-4 w-4" />
                Allow Access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdateGroupAccess(group.groupName, true)}>
                <LockKeyhole className="mr-2 h-4 w-4" />
                Deny Access
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteGroup(group.groupName)}
              className="text-red-600 hover:!text-red-600 focus:!text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
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
  
  const [bulkAccessActionToConfirm, setBulkAccessActionToConfirm] = useState<"allow" | "deny" | null>(null);
  const [isConfirmBulkAccessDialogOpen, setIsConfirmBulkAccessDialogOpen] = useState(false);

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const actionQueryParam = searchParams.get("action")

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

      if (searchTerm) {
        criteriaForSearch.searchText = searchTerm;
      }

      for (const key in filtersToApply) {
        if (key !== 'sortBy' && key !== 'sortOrder' && key !== 'includeMemberCount' && filtersToApply[key] !== undefined && filtersToApply[key] !== "" && filtersToApply[key] !== "any") {
          criteriaForSearch[key] = filtersToApply[key];
        }
      }
      
      // Convert string "true"/"false" from filters to boolean for API
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
      // Add denyAccess filter if present
      if (criteriaForSearch.denyAccess !== undefined && criteriaForSearch.denyAccess !== "any") {
        criteriaForSearch.denyAccess = criteriaForSearch.denyAccess === 'true';
      } else {
        delete criteriaForSearch.denyAccess;
      }


      console.log("[GroupsPage] Fetching groups with criteria:", JSON.stringify(criteriaForSearch, null, 2));
      const data = await searchGroups(criteriaForSearch);
      console.log("[GroupsPage] Received data for groups:", data);

      setGroups(data.groups?.map((g: any) => ({ ...g, denyAccess: g.denyAccess ?? false })) || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error("Failed to fetch groups:", error);
      toast({
        title: "Error Fetching Groups",
        description: error.message || "Failed to load groups. Please try again.",
        variant: "destructive",
      });
      setGroups([]); 
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, toast]);

  useEffect(() => {
    if (actionQueryParam === "new" && !isAddGroupDialogOpen) {
      setIsAddGroupDialogOpen(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("action");
      window.history.replaceState({}, "", newUrl.toString());
    }
    fetchGroupsCallback(currentFilters);
  }, [page, limit, actionQueryParam, fetchGroupsCallback, currentFilters, isAddGroupDialogOpen]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) 
    fetchGroupsCallback(currentFilters)
  },[fetchGroupsCallback, currentFilters]);

  const handleFiltersChangeCallback = useCallback((newFilters: any) => {
    setCurrentFilters(prev => ({...prev, ...newFilters, includeMemberCount: true})); 
    setPage(1);
  }, []);


  const handleDeleteGroupCallback = useCallback(async () => {
    if (!groupToDelete) return

    try {
      await deleteGroup(groupToDelete)
      toast({
        title: "Group deleted",
        description: `Group ${groupToDelete} has been deleted successfully.`,
      })
      fetchGroupsCallback(currentFilters)
      setSelectedGroups(prev => prev.filter(g => g !== groupToDelete));
    } catch (error: any) {
      console.error("Failed to delete group:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete group. Please try again.",
        variant: "destructive",
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
        title: "VPN Access Updated",
        description: `VPN access for group ${groupName} has been ${deny ? "denied" : "allowed"}.`,
      });
      fetchGroupsCallback(currentFilters);
    } catch (error: any) {
      toast({
        title: "Error Updating Access",
        description: error.message || "Failed to update VPN access for the group.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmSingleAccessDialogOpen(false);
      setGroupToUpdateAccess(null);
    }
  }, [groupToUpdateAccess, fetchGroupsCallback, toast, currentFilters]);


  const confirmBulkUpdateAccess = useCallback((action: "allow" | "deny") => {
    if (selectedGroups.length === 0) {
      toast({ title: "No groups selected", description: "Please select groups to perform bulk actions.", variant: "destructive" });
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

    toast({ title: "Bulk Action Started", description: `Attempting to ${bulkAccessActionToConfirm} VPN access for ${selectedGroups.length} groups... This may take a moment.`});

    for (const groupName of selectedGroups) {
      try {
        await updateGroup(groupName, { denyAccess: deny });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to update access for group ${groupName}:`, error);
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
      variant: failCount > 0 && successCount === 0 ? "destructive" : (failCount > 0 ? "default" : "default")
    });

    fetchGroupsCallback(currentFilters);
    setSelectedGroups([]);
  }, [bulkAccessActionToConfirm, selectedGroups, fetchGroupsCallback, toast, currentFilters]);


  const handleSelectGroupCallback = useCallback((groupName: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups((prev) => [...prev, groupName])
    } else {
      setSelectedGroups((prev) => prev.filter((g) => g !== groupName))
    }
  }, []);

  const handleSelectAllCallback = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedGroups(groups.map((group) => group.groupName))
    } else {
      setSelectedGroups([])
    }
  }, [groups]);


  const handleExport = useCallback(() => {
    toast({
      title: "Coming Soon",
      description: "Export functionality will be available soon.",
    })
  }, [toast]);

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Groups Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddGroupDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>
      </div>

      {selectedGroups.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedGroups.length} groups selected</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmBulkUpdateAccess("allow")}
                  disabled={bulkActionLoading}
                >
                  <UnlockKeyhole className="mr-2 h-4 w-4" />
                  Allow Access
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmBulkUpdateAccess("deny")}
                  disabled={bulkActionLoading}
                >
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Deny Access
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGroups([])} disabled={bulkActionLoading}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Group Management</CardTitle>
              <CardDescription>Manage OpenVPN user groups and their access settings.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-6">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Quick search by group name..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit">Search</Button>
          </form>

          {showFilters && (
            <div className="mb-6">
              <AdvancedFilters type="groups" onFiltersChange={handleFiltersChangeCallback} initialFilters={currentFilters} />
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedGroups.length === groups.length && groups.length > 0}
                          onCheckedChange={(checked) => handleSelectAllCallback(Boolean(checked))}
                          disabled={groups.length === 0}
                        />
                      </TableHead>
                      <TableHead>Group Name & Status</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>MFA</TableHead>
                      <TableHead>Access Control</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No groups found matching your criteria
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
              Are you sure you want to delete group "{groupToDelete}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteGroupDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteGroupCallback}>
              Delete
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
              className={groupToUpdateAccess?.deny ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              Confirm {groupToUpdateAccess?.deny ? "Deny Access" : "Allow Access"}
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkAccessDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkUpdateAccess}
              disabled={bulkActionLoading}
              className={bulkAccessActionToConfirm === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkAccessActionToConfirm === "deny" ? "Deny Access" : "Allow Access"}`}
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
