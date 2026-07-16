import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Printer, TrendingUp, CreditCard, Package,
  FileText, Building2, BarChart3, Wrench, Link, Shield,
  BookOpen, LogOut, User, Settings, ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProfileSheet } from './ProfileSheet'

const allNavItems = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   roles: ['super-admin','admin','reports','view'] },
  { path: '/budget',      icon: BookOpen,         label: 'Budget',      roles: ['super-admin','admin','reports','view'] },
  { path: '/printers',    icon: Printer,         label: 'Printers',    roles: ['super-admin','admin','reports','view'] },
  { path: '/capex',       icon: TrendingUp,       label: 'CAPEX',       roles: ['super-admin','admin','reports','view'] },
  { path: '/opex',        icon: CreditCard,       label: 'OPEX',        roles: ['super-admin','admin','reports','view'] },
  { path: '/consumables', icon: Package,          label: 'Consumables', roles: ['super-admin','admin','reports','view'] },
  { path: '/contracts',   icon: FileText,         label: 'Contracts',   roles: ['super-admin','admin','reports','view'] },
  { path: '/suppliers',   icon: Building2,        label: 'Suppliers',   roles: ['super-admin','admin','reports','view'] },
  { path: '/maintenance', icon: Wrench,           label: 'Maintenance', roles: ['super-admin','admin','reports','view'] },
  { path: '/topaccess',     icon: Printer,         label: 'TopAccess',     roles: ['super-admin', 'admin', 'reports', 'view'], accent: 'violet' },
  { path: '/print-manager', icon: BookOpen,        label: 'Print Manager', roles: ['super-admin', 'admin'], accent: 'violet' },
  { path: '/reports',     icon: BarChart3,        label: 'Reports',     roles: ['super-admin','admin','reports'], accent: 'violet' },
  { path: '/snipeit',     icon: Link,             label: 'Snipe-IT',    roles: ['super-admin'], accent: 'violet', separator: true },
  { path: '/admin',       icon: Shield,           label: 'Admin',       roles: ['super-admin'], accent: 'violet' },
]

const roleLabel: Record<string, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  reports: 'Reports',
  view: 'View',
}

const roleBadgeVariant: Record<string, BadgeVariant> = {
  'super-admin': 'role-superadmin',
  admin:         'role-admin',
  reports:       'role-reports',
  view:          'role-view',
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const [profileOpen, setProfileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role))
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  const roleActiveStyle: Record<string, { bg: string; text: string; pill: string; iconBg: string; iconText: string }> = {
    'super-admin': { bg: 'bg-[#f3e8ff] dark:bg-[#581c87]/40', text: 'text-[#6b21a8] dark:text-[#d8b4fe]', pill: 'bg-[#f3e8ff] dark:bg-[#581c87]/40', iconBg: 'bg-[#6b21a8] dark:bg-[#581c87]', iconText: 'text-white' },
    'admin':       { bg: 'bg-[#dbeafe] dark:bg-[#1e3a8a]/40', text: 'text-[#1e40af] dark:text-[#93c5fd]', pill: 'bg-[#dbeafe] dark:bg-[#1e3a8a]/40', iconBg: 'bg-[#1e40af] dark:bg-[#1e3a8a]', iconText: 'text-white' },
    'reports':     { bg: 'bg-[#fef3c7] dark:bg-[#78350f]/40', text: 'text-[#92400e] dark:text-[#fcd34d]', pill: 'bg-[#fef3c7] dark:bg-[#78350f]/40', iconBg: 'bg-[#92400e] dark:bg-[#78350f]', iconText: 'text-white' },
    'view':        { bg: 'bg-[#dcfce7] dark:bg-[#14532d]/40', text: 'text-[#166534] dark:text-[#86efac]', pill: 'bg-[#dcfce7] dark:bg-[#14532d]/40', iconBg: 'bg-[#166534] dark:bg-[#14532d]', iconText: 'text-white' },
  }
  const roleStyle = roleActiveStyle[user?.role ?? 'view']

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <ShadSidebar collapsible="icon" className="border-r border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-150" style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08)' }}>
        {/* Logo header */}
        <SidebarHeader className="h-16 justify-center border-b border-border/40 px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary transition-all duration-200 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:rounded-md">
              <Printer className="text-primary-foreground transition-all duration-200 group-data-[collapsible=icon]:size-3.5" size={15} />
            </div>
            {!collapsed && (
              <span className="whitespace-nowrap text-sm font-bold text-foreground">
                Printer Asset Management
              </span>
            )}
          </div>
        </SidebarHeader>

        {/* Nav items */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.path}>
                      {item.separator && <div className="my-1 mx-2 border-t border-border/50" />}
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          'relative rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                          isActive ? roleStyle.text : 'text-muted-foreground hover:text-foreground',
                          isActive && roleStyle.bg,
                        )}
                      >
                        <NavLink to={item.path} className="flex items-center gap-3">
                          {isActive && (
                            <motion.span
                              layoutId="nav-pill"
                              className={cn('absolute inset-0 rounded-lg', roleStyle.pill)}
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          )}
                          <Icon size={17} className="relative shrink-0" />
                          <span className="relative">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Profile footer */}
        <SidebarFooter className="border-t border-border/40 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-muted"
                    tooltip={user?.name ?? 'Profile'}
                  >
                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                      <AvatarImage src={user?.avatar_url} alt={user?.name} />
                      <AvatarFallback className="rounded-lg text-[11px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left leading-tight">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                    </div>
                    <ChevronsUpDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user?.avatar_url} alt={user?.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user?.name}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <Badge variant={roleBadgeVariant[user?.role ?? 'view']} className="mt-2 text-[10px]">
                      {roleLabel[user?.role ?? 'view']}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    <User className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSignOutOpen(true)} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </ShadSidebar>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You'll be returned to the login screen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
