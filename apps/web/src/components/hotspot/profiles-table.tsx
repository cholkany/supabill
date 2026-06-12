"use client"

import * as React from "react";
import { PlusIcon, EllipsisVerticalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RouterDashboardData } from "@/lib/router-flow";


// Hotspot Profile Drawer for detail/edit
function ProfileDrawer({ profile }: { profile: any }) {
  const isMobile = useIsMobile();
  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {profile.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Hotspot Profile</DrawerTitle>
          <DrawerDescription>Edit details for "{profile.name}".</DrawerDescription>
        </DrawerHeader>
        <form className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Profile Name</Label>
            <Input id="name" defaultValue={profile.name} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="price">Price (USD)</Label>
            <Input id="price" type="number" step="0.01" defaultValue={profile.price} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="bandwidth">Bandwidth</Label>
            <Input id="bandwidth" defaultValue={profile.bandwidth} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" defaultValue={profile.duration} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="status">Status</Label>
            <Select defaultValue={profile.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="policies">Policies</Label>
            <Input id="policies" defaultValue={profile.policies} />
          </div>
        </form>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function HotspotProfilesTable({ profiles }: { profiles: RouterDashboardData['hotspotProfiles'] }) {
  
  return (
    <div className="flex flex-col gap-6 w-full">
        
      <div className="overflow-x-auto rounded-lg border w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Bandwidth</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Policies</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <ProfileDrawer profile={profile.name} />
                </TableCell>
                <TableCell>
                  ${}
                </TableCell>
                <TableCell>{profile.rateLimit}</TableCell>
                <TableCell>{profile?.sharedUsers}</TableCell>
                <TableCell>
                  <Badge variant="default">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>{profile.sharedUsers}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex h-8 w-8 p-0 text-muted-foreground"
                        size="icon"
                        aria-label="More"
                      >
                        <EllipsisVerticalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Deactivate</DropdownMenuItem>
                      <Separator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No hotspot profiles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
