
"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getUsers, getGroups } from "@/lib/api"
import { AdvancedFilters } from "@/components/advanced-filters"
import { Pagination } from "@/components/pagination"
import { Search, Download, FileText, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay, getCoreApiErrorMessage } from "@/lib/utils"

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState("users")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [currentFilters, setCurrentFilters] = useState<any>({});
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const fetchAvailableGroups = useCallback(async () => {
    try {
      const data = await getGroups(1, 100); // Fetch up to 100 groups for filtering
      setAvailableGroups(data.groups?.map((g: any) => g.groupName) || []);
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      // console.error("Failed to fetch groups for filter:", error);
    }
  }, [router]);

  useEffect(() => {
    if (activeTab === 'users') { 
        fetchAvailableGroups();
    }
  }, [activeTab, fetchAvailableGroups]);


  const handleSearchCallback = useCallback(async (filters: any) => {
    setIsSearching(true)
    setCurrentFilters(filters); 
    try {
      const apiFunction = activeTab === "users" ? getUsers : getGroups;
      const results = await apiFunction(currentPage, itemsPerPage, filters);
      setSearchResults(results);
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Search Failed",
        description: getCoreApiErrorMessage(error) || "Failed to perform search. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      setSearchResults(null); 
    } finally {
      setIsSearching(false);
    }
  }, [activeTab, currentPage, itemsPerPage, toast, router]);

  useEffect(() => {
    if (Object.keys(currentFilters).length > 0 || (searchResults && searchResults.total > 0) ) {
        handleSearchCallback(currentFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const handleExportCallback = useCallback(() => {
    if (!searchResults) return

    const data = activeTab === "users" ? searchResults.users : searchResults.groups
    if (!data || data.length === 0) {
        toast({
            title: "No Data to Export",
            description: "There are no search results to export.",
            variant: "destructive"
        });
        return;
    }

    const headers =
      activeTab === "users"
        ? ["Username", "Email", "Group", "Auth Method", "Expiration", "Status", "Role", "MFA"]
        : ["Group Name", "Auth Method", "Role", "MFA Required", "Member Count", "Status"];

    const csvContent = [
      headers.join(","),
      ...data.map((item: any) => {
        if (activeTab === "users") {
          return [
            item.username || "",
            item.email || "",
            item.groupName || "N/A",
            item.authMethod || "N/A",
            formatDateForDisplay(item.userExpiration || "N/A"),
            item.isEnabled !== false ? "Active" : "Disabled",
            item.role || "N/A",
            item.mfa || item.mfaEnabled ? "Yes" : "No", // Use mfa or mfaEnabled
          ].join(",")
        } else { // groups
          return [
            item.groupName || "",
            item.authMethod || "N/A",
            item.role || "N/A",
            item.mfa || item.mfaEnabled ? "Yes" : "No",  // Use mfa or mfaEnabled
            item.memberCount ?? "N/A",
            item.isEnabled !== false ? "Active" : "Disabled",
          ].join(",")
        }
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTab}_search_results.csv`
    document.body.appendChild(a);
    a.click()
    document.body.removeChild(a);
    URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: `Search results exported to ${activeTab}_search_results.csv`,
      variant: "success",
    })
  }, [searchResults, activeTab, toast]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Search</h1>
        {searchResults && (searchResults.users?.length > 0 || searchResults.groups?.length > 0) && (
          <Button onClick={handleExportCallback} disabled={isSearching}>
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
        )}
      </div>

      <Tabs defaultValue="users" value={activeTab} onValueChange={(newTab) => {
        setActiveTab(newTab);
        setSearchResults(null); 
        setCurrentFilters({}); 
        setCurrentPage(1); 
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Search Users</TabsTrigger>
          <TabsTrigger value="groups">Search Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <AdvancedFilters type="users" onFiltersChange={handleSearchCallback} availableGroups={availableGroups} initialFilters={currentFilters}/>

          {isSearching && !searchResults && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          )}

          {searchResults && activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Results
                </CardTitle>
                <CardDescription>Found {searchResults.total || 0} users matching your criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <>
                      <div className="rounded-md border">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-medium">User</th>
                                <th className="p-3 text-left font-medium">Email</th>
                                <th className="p-3 text-left font-medium">Group</th>
                                <th className="p-3 text-left font-medium">Auth Method</th>
                                <th className="p-3 text-left font-medium">Expiration</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-left font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searchResults.users?.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No results found
                                  </td>
                                </tr>
                              ) : (
                                searchResults.users?.map((user: any) => (
                                  <tr key={user.username} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                      <div>
                                        <div className="font-medium">{user.username}</div>
                                        <div className="text-sm text-muted-foreground">{user.role || "N/A"}</div>
                                      </div>
                                    </td>
                                    <td className="p-3">{user.email || "N/A"}</td>
                                    <td className="p-3">
                                      {user.groupName ? (
                                        <Badge variant="outline">{user.groupName}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="secondary">{user.authMethod || "N/A"}</Badge>
                                    </td>
                                    <td className="p-3">{formatDateForDisplay(user.userExpiration)}</td>
                                    <td className="p-3">
                                      <Badge variant={user.isEnabled !== false ? "default" : "destructive"}>
                                        {user.isEnabled !== false ? "Active" : "Disabled"}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/dashboard/users/${user.username}`}>View</Link>
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {searchResults.users?.length > 0 && (
                        <Pagination
                          currentPage={searchResults.page || 1}
                          totalPages={searchResults.totalPages || 1}
                          totalItems={searchResults.total || 0}
                          itemsPerPage={itemsPerPage}
                          onPageChange={(page) => {
                            setCurrentPage(page)
                          }}
                          onItemsPerPageChange={(newLimit) => {
                            setItemsPerPage(newLimit)
                            setCurrentPage(1)
                          }}
                        />
                      )}
                    </>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <AdvancedFilters type="groups" onFiltersChange={handleSearchCallback} initialFilters={currentFilters} />

          {isSearching && !searchResults && (
             <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          )}

          {searchResults && activeTab === "groups" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Results
                </CardTitle>
                <CardDescription>Found {searchResults.total || 0} groups matching your criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <>
                      <div className="rounded-md border">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-medium">Group Name</th>
                                <th className="p-3 text-left font-medium">Auth Method</th>
                                <th className="p-3 text-left font-medium">Role</th>
                                <th className="p-3 text-left font-medium">MFA Required</th>
                                <th className="p-3 text-left font-medium">Member Count</th>
                                <th className="p-3 text-left font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searchResults.groups?.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No results found
                                  </td>
                                </tr>
                              ) : (
                                searchResults.groups?.map((group: any) => (
                                  <tr key={group.groupName} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                      <div className="font-medium">{group.groupName}</div>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline">{group.authMethod || "N/A"}</Badge>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="secondary">{group.role || "N/A"}</Badge>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant={group.mfa || group.mfaEnabled ? "default" : "outline"}>
                                        {group.mfa || group.mfaEnabled ? "Yes" : "No"}
                                      </Badge>
                                    </td>
                                    <td className="p-3">{group.memberCount ?? "N/A"}</td>
                                    <td className="p-3">
                                      <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/dashboard/groups/${group.groupName}`}>View</Link>
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {searchResults.groups?.length > 0 && (
                        <Pagination
                          currentPage={searchResults.page || 1}
                          totalPages={searchResults.totalPages || 1}
                          totalItems={searchResults.total || 0}
                          itemsPerPage={itemsPerPage}
                          onPageChange={(page) => {
                            setCurrentPage(page)
                          }}
                          onItemsPerPageChange={(newLimit) => {
                            setItemsPerPage(newLimit)
                            setCurrentPage(1) 
                          }}
                        />
                      )}
                    </>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
