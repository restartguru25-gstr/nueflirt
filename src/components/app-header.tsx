
'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Bell, Search, Crown, Heart, Shield, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/locale-context";
import { LanguageSwitcher } from "@/components/language-switcher";

const navLinks = [
    { href: "/dashboard", labelKey: "nav.discover" },
    { href: "/matches", labelKey: "nav.matches" },
    { href: "/likes-you", labelKey: "nav.likes", icon: Heart },
];

export function AppHeader() {
    const pathname = usePathname();
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const { t } = useLocale();

    const handleLogout = () => {
        if (!auth) return;
        signOut(auth);
        router.push('/');
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center">
                <Logo className="mr-8" />
                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "transition-colors hover:text-foreground/80 flex items-center gap-1",
                                pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            {link.icon && <link.icon className="h-4 w-4" />}
                            {t(link.labelKey)}
                        </Link>
                    ))}
                </nav>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <Button variant="ghost" size="icon" className="hidden md:inline-flex">
                        <Search className="h-5 w-5" />
                        <span className="sr-only">{t('nav.search')}</span>
                    </Button>
                    <LanguageSwitcher />
                     <Button variant="ghost" size="icon" asChild>
                        <Link href="/subscribe">
                            <Crown className="h-5 w-5 text-amber-500" />
                            <span className="sr-only">Subscription</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Avatar className="cursor-pointer h-9 w-9">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild><Link href="/profile">{t('nav.profile')}</Link></DropdownMenuItem>
                             <DropdownMenuItem asChild><Link href="/subscribe">{t('nav.subscription')}</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/safety"><Shield className="mr-2 h-4 w-4" />{t('nav.safety')}</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/events"><Calendar className="mr-2 h-4 w-4" />{t('nav.events')}</Link></DropdownMenuItem>
                            <DropdownMenuItem>{t('nav.settings')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>{t('nav.logout')}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
