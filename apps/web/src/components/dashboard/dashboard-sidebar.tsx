"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    LayoutDashboard,
    Map,
    PieChart,
    Router,
    Settings2,
    SquareTerminal,
    Wifi,
} from "lucide-react"

import { NavMain } from '@/components/dashboard/nav-main'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar'
import { TeamSwitcher } from "./team-switcher"
import { NavProjects } from "./nav-project"
import { NavUser } from "./nav-user"
import { Button } from "../ui/button"
import Link from "next/link"

// This is sample data.
const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "Acme Inc",
            logo: GalleryVerticalEnd,
            plan: "Enterprise",
        },
        {
            name: "Acme Corp.",
            logo: AudioWaveform,
            plan: "Startup",
        },
        {
            name: "Evil Corp.",
            logo: Command,
            plan: "Free",
        },
    ],
    navMain: (routerId: string) => [
        {
            title: "Hotspot",
            url: "#",
            icon: Wifi,
            isActive: true,
            items: [
                {
                    title: "Profiles",
                    url: `/routers/${routerId}/hotspot/profiles`,
                },
                {
                    title: "Users",
                    url: `/routers/${routerId}/hotspot/users`,
                },
                {
                    title: "Vouchers",
                    url: `/routers/${routerId}/hotspot/vouchers`,
                },
            ],
        },
        {
            title: "Devices",
            url: "#",
            icon: Router,
            items: [
                {
                    title: "Stats",
                    url: "#",
                },
                {
                    title: "Add New",
                    url: "#",
                },
                {
                    title: "WireGuard",
                    url: "#",
                },
                {
                    title: "Logs",
                    url: "#",
                },
            ],
        },

    ],
    projects: [
        {
            name: "Billing",
            url: "#",
            icon: Frame,
        },
        {
            name: "Sales & Marketing",
            url: "#",
            icon: PieChart,
        },
        {
            name: "Invoices",
            url: "#",
            icon: Map,
        },
    ],
}

export function AppSidebar({ routerId, ...props }: React.ComponentProps<typeof Sidebar> & { routerId: string }) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex w-fit items-center gap-2  px-2"
                        >
                            <Link href={`/routers/${routerId}`}
                                className="flex w-fit items-center gap-2"
                            >
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </Link>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavMain items={data.navMain(routerId)} />
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
