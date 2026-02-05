'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MessageCircle, User, Heart } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

const navLinkKeys = [
    { href: "/dashboard", labelKey: "nav.discover", icon: Home },
    { href: "/likes-you", labelKey: "nav.likes", icon: Heart },
    { href: "/chat", labelKey: "nav.chat", icon: MessageCircle },
    { href: "/profile", labelKey: "nav.profile", icon: User },
] as const;

export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLocale();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
            <nav className="grid h-full grid-cols-4">
                {navLinkKeys.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex flex-col items-center justify-center"
                        >
                            <link.icon className={cn(
                                "h-6 w-6 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                                "text-xs mt-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                                {t(link.labelKey)}
                            </span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
