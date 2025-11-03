import React from 'react';
import { Outlet, useLocation } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { GlobalHeader } from './global-header';
import { AppsDataProvider } from '@/contexts/apps-data-context';
import { ArrowUpRight } from 'lucide-react'
import clsx from 'clsx';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  return (
    <AppsDataProvider>
      <SidebarProvider
        defaultOpen={false}
        style={{
          "--sidebar-width": "320px",
          "--sidebar-width-mobile": "280px",
          "--sidebar-width-icon": "52px"
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className={clsx("bg-background flex flex-col h-screen relative", pathname !== "/" && "overflow-hidden")}>
          	<GlobalHeader />
		  	<div className={clsx("flex-1 bg-gradient-to-b from-transparent to-bg-1", pathname !== "/" && "min-h-0 overflow-auto")}>
				{children || <Outlet />}
		  	</div>
			<footer className={clsx("divide-double", pathname !== "/" ? "bg-bg-3" : "bg-bg-1")}>
				<div className="container mx-auto pb-4">
					<div className="px-8 pt-4 text-center sm:text-left text-muted-foreground text-xs flex flex-col sm:flex-row gap-4">
						<a
							href="https://crowdin.com/"
							target="_blank"
							className="whitespace-nowrap inline-flex"
						>
							<span className="align-middle ml-1">Made by Crowdin</span>
							<ArrowUpRight className="size-4" />
						</a>
						<div className="flex flex-row divide-x items-center justify-center sm:justify-end sm:ml-auto">
							<a
								className="px-4"
								href="https://support.crowdin.com/cookies/"
								target="_blank"
							>
								Cookies
							</a>
							<a
								className="px-4"
								href="https://support.crowdin.com/privacy-policy/"
								target="_blank"
							>
								Privacy Policy
							</a>
							<a href="#">
								Terms and Conditions
							</a>
						</div>
					</div>
				</div>
			</footer>
        </SidebarInset>
      </SidebarProvider>
    </AppsDataProvider>
  );
}
