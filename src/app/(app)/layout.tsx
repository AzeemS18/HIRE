
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Briefcase,
  Users,
  LayoutDashboard,
  BarChart3,
  Settings,
  UserCheck,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import XyroChatbot from '@/components/xyro-chatbot';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/candidates', icon: Users, label: 'Candidates' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/onboarding', icon: UserCheck, label: 'Onboarding' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // When the user navigates away, clear the search
    if (pathname !== '/candidates') {
      setSearchValue('');
    }
  }, [pathname]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchValue(query);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    // Using router.replace to avoid adding to history
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (isUserLoading || !user) {
    return (
       <div className="flex min-h-screen w-full bg-muted/40">
        <aside className="hidden w-14 flex-col border-r bg-background sm:flex">
          <div className="flex h-full flex-col gap-4 p-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </aside>
        <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-4">
               <div className="relative ml-auto flex-1 md:grow-0">
                  <Skeleton className="h-8 w-full rounded-lg pl-8 md:w-[200px] lg:w-[320px]" />
               </div>
               <Skeleton className="h-9 w-9 rounded-full" />
            </header>
            <main className="flex-1 p-4 sm:p-6">
               <Skeleton className="w-full h-96 rounded-lg" />
            </main>
        </div>
      </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-7 w-7 text-primary"
              fill="currentColor"
            >
              <path d="M16.998 10.001A5 5 0 0 0 7.002 10c-2.28 0-4.484.93-6.002 2.697C.337 13.46.002 14.283 0 15.155V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3.845c-.002-.872-.337-1.695-.998-2.468a4.956 4.956 0 0 0-3.004-1.686zM8 8.001a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM24 15.155c0-.872-.335-1.695-1-2.468A5.002 5.002 0 0 0 17 8.997a5.002 5.002 0 0 0-4.47 2.686 6.967 6.967 0 0 1 4.23 3.282A3.001 3.001 0 0 1 18 18.001h4a1 1 0 0 0 1-1v-1.846c0-.872-.335-1.695-1-2.468a4.956 4.956 0 0 0-3.004-1.686 4.956 4.956 0 0 0 3.004-1.686zM15 8.001a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
            </svg>
            <h1 className="text-xl font-semibold">HireGenius</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-4">
          <SidebarTrigger className="sm:hidden" />
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search candidates..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              value={searchValue}
              onChange={handleSearchChange}
              disabled={pathname !== '/candidates'}
            />
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <XyroChatbot />
      </SidebarInset>
    </SidebarProvider>
  );
}

    