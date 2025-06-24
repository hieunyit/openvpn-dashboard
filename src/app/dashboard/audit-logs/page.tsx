
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getAuditLogs, exportAuditLogs } from "@/lib/api"
import { History, Download, AlertTriangle, CheckCircle, FileText, Filter, Calendar as CalendarIcon, X } from "lucide-react"
import { formatDateForDisplay, getCoreApiErrorMessage } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Pagination } from "@/components/pagination"

interface AuditLog {
  ID: string
  UserID: string
  Username: string
  UserGroup: string
  Action: string
  ResourceType: string
  ResourceName: string
  Success: boolean
  IPAddress: string
  CreatedAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)

  const [filters, setFilters] = useState({
    username: "",
    group: "",
    ip: "",
    from: undefined as Date | undefined,
    to: undefined as Date | undefined,
  })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const apiFilters: any = {
        page,
        limit,
        username: filters.username || undefined,
        group: filters.group || undefined,
        ip: filters.ip || undefined,
        from: filters.from ? format(filters.from, "yyyy-MM-dd") : undefined,
        to: filters.to ? format(filters.to, "yyyy-MM-dd") : undefined,
      }
      const data = await getAuditLogs(apiFilters)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Error Fetching Logs",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters, toast, router])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExport = async () => {
    setIsExporting(true)
    try {
       const apiFilters: any = {
        username: filters.username || undefined,
        group: filters.group || undefined,
        ip: filters.ip || undefined,
        from: filters.from ? format(filters.from, "yyyy-MM-dd") : undefined,
        to: filters.to ? format(filters.to, "yyyy-MM-dd") : undefined,
      }
      await exportAuditLogs(apiFilters)
      toast({
        title: "Export Started",
        description: "Your audit log export has been downloaded.",
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Export Failed",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ username: "", group: "", ip: "", from: undefined, to: undefined });
    if (page !== 1) setPage(1);
    else fetchLogs();
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground mt-1">Review system and user activity across the portal.</p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Logs"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filter Logs</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
             <Input
              placeholder="Filter by Username..."
              value={filters.username}
              onChange={(e) => handleFilterChange("username", e.target.value)}
            />
            <Input
              placeholder="Filter by Group..."
              value={filters.group}
              onChange={(e) => handleFilterChange("group", e.target.value)}
            />
            <Input
              placeholder="Filter by IP Address..."
              value={filters.ip}
              onChange={(e) => handleFilterChange("ip", e.target.value)}
            />
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.from ? format(filters.from, "PPP") : <span>From Date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={filters.from} onSelect={(date) => handleFilterChange("from", date)} initialFocus />
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.to ? format(filters.to, "PPP") : <span>To Date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={filters.to} onSelect={(date) => handleFilterChange("to", date)} initialFocus />
                    </PopoverContent>
                </Popover>
                 <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                    <X className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                    ))
                ) : logs.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                        No audit logs found for the selected criteria.
                    </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                    <TableRow key={log.ID}>
                        <TableCell className="font-medium text-sm whitespace-nowrap">{formatDateForDisplay(log.CreatedAt)}</TableCell>
                        <TableCell>{log.Username || log.UserID}</TableCell>
                        <TableCell>{log.Action}</TableCell>
                        <TableCell>{log.ResourceType}: {log.ResourceName}</TableCell>
                        <TableCell>
                        <Badge variant={log.Success ? "default" : "destructive"} className={log.Success ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                            {log.Success ? "Success" : "Failed"}
                        </Badge>
                        </TableCell>
                        <TableCell>{log.IPAddress}</TableCell>
                    </TableRow>
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
        </CardContent>
      </Card>
    </div>
  )
}
