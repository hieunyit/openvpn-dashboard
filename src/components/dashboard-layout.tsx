
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { getUser, logout } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  Menu,
  LogOut,
  ShieldCheck,
  Server,
  UserCircle2,
  LifeBuoy,
  LayoutGrid, // New icon for main dashboard
  ChevronDown,
} from "lucide-react"

interface NavSubItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface NavItemConfig {
  title: string;
  href?: string;
  icon: React.ElementType;
  subItems?: NavSubItem[];
  isInitiallyOpen?: boolean;
}

const navConfig: NavItemConfig[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "OpenVPN",
    icon: ShieldCheck,
    isInitiallyOpen: true,
    subItems: [
      { title: "Overview", href: "/dashboard/openvpn/overview", icon: LayoutDashboard },
      { title: "Users", href: "/dashboard/users", icon: Users },
      { title: "Groups", href: "/dashboard/groups", icon: FolderKanban },
      { title: "VPN Status", href: "/dashboard/status", icon: Server },
    ],
  },
  // Placeholder for future LDAP Management
  // {
  //   title: "LDAP Management",
  //   icon: UsersCog, // Example icon - ensure UsersCog is imported if used
  //   isInitiallyOpen: false,
  //   subItems: [
  //     { title: "LDAP Users", href: "/dashboard/ldap/users", icon: Users },
  //     { title: "LDAP Groups", href: "/dashboard/ldap/groups", icon: FolderKanban },
  //   ],
  // },
];

const bottomNavItems: NavItemConfig[] = [
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const isParentOrChildActive = (pathname: string, parentItem: NavItemConfig): boolean => {
  if (parentItem.href && (pathname === parentItem.href || pathname.startsWith(parentItem.href + '/'))) {
    return true;
  }
  if (parentItem.subItems) {
    return parentItem.subItems.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href + '/'));
  }
  return false;
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useMobile()
  const [user, setUser] = useState<any>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const userData = getUser()
    setUser(userData)
  }, [])

  const handleLogout = () => {
    logout()
    toast({
      title: "Logged Out Successfully",
      description: "You have been securely logged out of your account.",
      variant: "success",
    })
    router.push("/login")
  }

  const getInitials = (username?: string) => {
    if (!username) return "U";
    const names = username.split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length -1][0].toUpperCase();
  }

  const SidebarContent = ({ isMobileNav = false }: { isMobileNav?: boolean}) => (
    <>
      {isMobileNav ? (
        <SheetHeader className="p-0 border-b h-16 shrink-0">
           <div className="flex items-center gap-3 p-4 h-full">
            <LayoutGrid className="h-7 w-7 text-primary" /> {/* Portal Icon */}
            <span className="font-semibold text-xl text-foreground whitespace-nowrap">System Portal</span>
          </div>
          <SheetTitle className="sr-only">Main Navigation Menu</SheetTitle>
        </SheetHeader>
      ) : (
        <div className="flex items-center gap-3 p-4 h-16 border-b shrink-0">
          <LayoutGrid className="h-7 w-7 text-primary" /> {/* Portal Icon */}
          <span className="font-semibold text-xl text-foreground whitespace-nowrap">System Portal</span>
        </div>
      )}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navConfig.map((item) => (
          item.subItems && item.subItems.length > 0 ? (
            <Collapsible 
              key={item.title} 
              defaultOpen={item.isInitiallyOpen || isParentOrChildActive(pathname, item)} 
              className="space-y-1"
            >
              <CollapsibleTrigger className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all w-full group",
                isParentOrChildActive(pathname, item)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-2 pl-5 border-l border-muted-foreground/20 space-y-1 py-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={() => isMobileNav && setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-all",
                      pathname === subItem.href || pathname.startsWith(subItem.href + '/') 
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <subItem.icon className="h-4 w-4" /> {/* Smaller icon for sub-items */}
                    {subItem.title}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link
              key={item.href || item.title}
              href={item.href!} 
              onClick={() => isMobileNav && setMobileNavOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all",
                isParentOrChildActive(pathname, item)
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        ))}
      </nav>
      <div className="mt-auto p-3 border-t space-y-1.5 shrink-0">
         {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href!}
            onClick={() => isMobileNav && setMobileNavOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all",
              isParentOrChildActive(pathname, item)
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </Link>
        ))}
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground px-3 py-2.5 text-base" onClick={handleLogout}>
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </>
  );


  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {isMobile ? (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-4 left-4 z-40 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-background flex flex-col border-r shadow-lg">
            <SidebarContent isMobileNav={true} />
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="hidden md:flex flex-col w-64 bg-background border-r shadow-sm fixed top-0 left-0 h-screen z-20">
           <SidebarContent isMobileNav={false} />
        </aside>
      )}

      <div className={cn(
          "flex flex-1 flex-col",
          !isMobile && "md:ml-64" 
        )}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between shrink-0 gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
          {isMobile ? (
             <div className="w-9 h-9"/> 
          ) : (
            <div/> 
          )}
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Profile (Settings)</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto bg-background md:bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  )
}
