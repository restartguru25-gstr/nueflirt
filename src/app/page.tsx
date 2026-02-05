'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Heart, MessageCircle, Shield, Zap, Users, ChevronRight } from "lucide-react";
import Link from 'next/link';
import { Logo } from "@/components/logo";
import { motion } from 'framer-motion';

const features = [
  {
    icon: <Film className="h-7 w-7 text-primary" />,
    title: "AI Videos & Reveals",
    description: "Stand out with AI-generated profile videos and playful interactive reveals for matches.",
  },
  {
    icon: <Heart className="h-7 w-7 text-primary" />,
    title: "Swipe & Match",
    description: "Discover people with smart filters—language, region, zodiac—and connect when it’s mutual.",
  },
  {
    icon: <MessageCircle className="h-7 w-7 text-primary" />,
    title: "Chat & Calls",
    description: "Real-time chat with photos, voice notes, and voice or video calls when you’re ready.",
  },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="btn-press">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="btn-press rounded-full shadow-soft hover:shadow-glow-primary transition-shadow">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow">
        {/* Hero — dating-app style */}
        <section className="relative container mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-2xl mx-auto"
          >
            <h1 className="font-brand text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Find your spark.
              <br />
              <span className="text-primary">Nue Flirt.</span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-5 text-base md:text-lg text-muted-foreground max-w-md mx-auto"
            >
              Dating reimagined for India. AI videos, smart filters, chat & calls—all in one app.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row justify-center gap-3"
            >
              <Button size="lg" asChild className="btn-press rounded-full px-8 shadow-soft hover:shadow-glow-primary transition-all">
                <Link href="/signup">Get started free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="btn-press rounded-full px-8">
                <Link href="/login">I already have an account</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features — 3 cards, scannable */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-sm font-medium uppercase tracking-wider text-primary mb-2"
          >
            Why Nue Flirt
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-2xl md:text-3xl font-brand font-bold text-foreground mb-12"
          >
            More than just a profile
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full rounded-2xl border-primary/10 bg-card/80 backdrop-blur-sm shadow-soft hover:shadow-card transition-all duration-300 overflow-hidden">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-lg pt-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* One-line trust strip — replaces long About + bullet list */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-card/60 border border-border/60 p-6 md:p-8 text-center"
          >
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
              Built for India with multiple languages (English, हिन्दी, తెలుగు, தமிழ்), smart filters, and Discreet Legacy Mode. 
              Swipe, chat, voice & video calls, and in-app events—plus offline mode and PWA install.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-primary" /> Like & Super Like</span>
              <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-primary" /> Chat & calls</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Safety & Legacy</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Vibes & events</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Virtual dates</span>
            </div>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto text-center rounded-2xl bg-primary/5 border border-primary/10 p-8 md:p-10"
          >
            <h2 className="text-xl md:text-2xl font-brand font-bold text-foreground">Ready to meet someone new?</h2>
            <p className="mt-2 text-muted-foreground text-sm">Join Nue Flirt and start matching today.</p>
            <Button size="lg" asChild className="mt-6 rounded-full px-8 shadow-soft hover:shadow-glow-primary">
              <Link href="/signup">Create free account <ChevronRight className="ml-1 h-5 w-5" /></Link>
            </Button>
          </motion.div>
        </section>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-border/50 bg-secondary/30"
      >
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-muted-foreground text-xs sm:text-sm">&copy; {new Date().getFullYear()} Nue Flirt. All rights reserved.</p>
        </div>
      </motion.footer>
    </div>
  );
}
