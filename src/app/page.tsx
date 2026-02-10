'use client';
import { Button } from "@/components/ui/button";
import { FeatureTilesGrid, FeatureTile, DETAILED_FEATURES } from "@/components/feature-tile";
import { Heart, MessageCircle, Shield, Zap, Users, ChevronRight } from "lucide-react";
import Link from 'next/link';
import { Logo } from "@/components/logo";
import { motion } from 'framer-motion';

const heroFeaturesSubset = DETAILED_FEATURES.slice(0, 6);


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
        {/* Hero — two-column: headline + CTAs left, features panel right */}
        <section className="relative container mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center lg:text-left"
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
                className="mt-5 text-base md:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0"
              >
                Dating reimagined for India. AI videos, smart filters, chat & calls—all in one app.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3"
              >
                <Button size="lg" asChild className="btn-press rounded-full px-8 shadow-soft hover:shadow-glow-primary transition-all">
                  <Link href="/signup">Get started free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="btn-press rounded-full px-8">
                  <Link href="/login">I already have an account</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Features panel — modern, no image */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 shadow-soft overflow-hidden p-5 md:p-6"
            >
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">What’s inside</p>
                <h3 className="font-brand font-bold text-foreground mt-1 text-lg">App features</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {heroFeaturesSubset.map((f, i) => (
                  <FeatureTile key={f.title} feature={f} index={i} compact />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Detailed feature tiles — animated grid */}
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
          <FeatureTilesGrid
            features={DETAILED_FEATURES}
            columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          />
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
