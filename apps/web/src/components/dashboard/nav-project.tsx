"use client"

import {
    Folder,
    Forward,
    MoreHorizontal,
    Trash2,
    type LucideIcon,
} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'
import { Button } from "../ui/button"

export function NavProjects({
    projects,
}: {
    projects: {
        name: string
        url: string
        icon: LucideIcon
    }[]
}) {
    const { isMobile } = useSidebar()

    return (
        <SidebarMenu>
            {projects.map((item) => (
                <SidebarMenuItem key={item.name}>
                    <Button asChild
                        variant="ghost"
                        size="sm"
                        className="flex w-fit items-center gap-2  px-2"
                    >
                        <a href={item.url}>
                            <item.icon />
                            <span>{item.name}</span>
                        </a>
                    </Button>
                </SidebarMenuItem>
            ))}
            {/* <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70">
                        <MoreHorizontal className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem> */}
        </SidebarMenu>
    )
}
