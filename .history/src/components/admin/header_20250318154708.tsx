// src/components/admin/header.tsx
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Menu, X, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShop } from "../providers/shop-provider";

export default function AdminHeader() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                href="/admin"
                className="border-transparent text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                {session?.user?.shopName || "Dashboard"}
              </Link>
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                View Shop
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Button variant="outline" size="sm" className="mx-2">
                <Bell className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Notifications</span>
              </Button>
            </div>
            <div className="ml-3 relative">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <User className="h-4 w-4 mr-1" />
                  <span className="text-sm text-gray-700">
                    {session?.user?.name || "Profile"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
