'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MessageCircle, User, Heart, ShieldCheck, Zap, Film } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

const navLinkKeys = [
    { href: "/dashboard", labelKey: "nav.discover", icon: Home },
    { href: "/library", labelKey: "nav.library", icon: Film },
    { href: "/legacy", labelKey: "nav.legacy", icon: ShieldCheck },
    { href: "/vibes", labelKey: "nav.vibes", icon: Zap },
    { href: "/likes-you", labelKey: "nav.likes", icon: Heart },
    { href: "/chat", labelKey: "nav.chat", icon: MessageCircle },
    { href: "/profile", labelKey: "nav.profile", icon: User },
] as const;

export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLocale();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-pb">
            <nav className="grid h-full grid-cols-7 relative">
                {navLinkKeys.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    
                    return (
                        <div key={link.href} className="relative flex flex-col items-center justify-center active:scale-95 transition-transform">
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-primary" />
                            )}
                            <Link
                                href={link.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 py-2 relative z-10",
                                    isActive && "font-medium"
                                )}
                            >
                                <link.icon className={cn(
                                    "h-6 w-6 transition-colors duration-200",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                    "text-xs transition-colors duration-200",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {t(link.labelKey)}
                                </span>
                            </Link>
                        </div>
                    )
                })}
            </nav>
        </div>
    );
}
