
"use client"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <Card>
        <CardHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
             <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <Skeleton className="h-10 w-full sm:max-w-xs" />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-full sm:w-36" />
                    <Skeleton className="h-10 w-full sm:w-36" />
                </div>
            </div>
            <Skeleton className="h-10 w-full sm:w-auto sm:min-w-[120px]" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 px-4"><Skeleton className="h-5 w-5" /></TableHead>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>
                  ))}
                  <TableHead className="text-right px-4"><Skeleton className="h-5 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="p-2">
                        <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full sm:w-96" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
