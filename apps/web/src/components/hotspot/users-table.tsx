'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RouterDashboardData } from '@/lib/router-flow';

const HotspotUsersTable = ({ users }: { users: RouterDashboardData['hotspotUsers'] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(users.length / itemsPerPage);

  const currentUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === currentUsers.length && currentUsers.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map((user) => user.id));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Main Card */}
      <div className='pb-0 gap-0 overflow-x-auto rounded-lg border w-full'>
        <div className="border-b border-border gap-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search user"
                className="pl-10"
              />
            </div>
            <div className="sm:ml-auto flex items-center gap-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs cursor-pointer">
                <Filter />
                Filter
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs cursor-pointer">
                    <Download data-icon="inline-start" />
                    Export
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer">Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Export as Excel</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Export as PDF</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className="h-8 px-3 text-xs bg-primary cursor-pointer">
                <UserPlus className="size-4 mr-2" />
                Generate Users
              </Button>
            </div>
          </div>
        </div>
        <div className="p-0">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-sm text-muted-foreground">
                    <Checkbox
                      checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                      onCheckedChange={toggleAllUsers}
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Username
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-nowrap text-muted-foreground uppercase tracking-wider">
                    Uptime
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-nowrap text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-nowrap text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 bg-muted">
                          <AvatarImage src={user.username} alt={user.username} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{user.profile}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-foreground text-nowrap">{user.uptime}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground text-nowrap">{user.ipAddress}</span>
                    </td>
                    <td className="p-4 text-center">
                      {user.status === "online" ? (
                        <Badge variant="outline" className="px-2.5 py-0.5 font-semibold bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="px-2.5 py-0.5 font-semibold bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                          Offline
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground text-nowrap">{user.ipAddress}</span>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs cursor-pointer">
                            Actions
                            <ChevronDown data-icon="inline-end" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer py-2">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer py-2">View Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive cursor-pointer py-2">Delete</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                  className={cn('h-9 w-9', currentPage === page && 'bg-primary', 'cursor-pointer')}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotUsersTable;
