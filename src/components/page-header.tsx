"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  className?: string
}

export default function PageHeader({ title, description, icon, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {icon && <div className="mt-1">{icon}</div>}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  )
}
