'use client';
import { useIsMobile } from "@/hooks/use-mobile";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { usePresence } from "@/hooks/use-presence";
import { NotificationHandler } from "./notification-handler";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    usePresence(); // Hook to manage user's online status

    return (
        <div className="min-h-screen flex flex-col">
            {!isMobile && <AppHeader />}
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            {isMobile && <div className="h-16" />} {/* Spacer for bottom nav */}
            {isMobile && <BottomNav />}
            <NotificationHandler />
        </div>
    );
}
