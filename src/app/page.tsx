'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Sparkles, Wind, Heart, MessageCircle, Shield, Zap, Users } from "lucide-react";
import Link from 'next/link';
import { Logo } from "@/components/logo";
import { motion } from 'framer-motion';

const features = [
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "AI-Generated Videos",
    description: "Create unique, stunning profile videos that capture your essence. Our AI brings your photos to life.",
  },
  {
    icon: <Film className="h-8 w-8 text-primary" />,
    title: "Interactive Reveals",
    description: "Break the ice with interactive video reveals, available for mutual matches. A fun, consensual way to connect.",
  },
  {
    icon: <Wind className="h-8 w-8 text-primary" />,
    title: "Swipe & Match",
    description: "Discover profiles with dynamic video teasers. Our smart filters help you find the right match in India.",
  },
];

const appFeatures = [
  { icon: <Heart className="h-5 w-5 text-primary" />, text: "Swipe, Like, Super Like & Rose" },
  { icon: <MessageCircle className="h-5 w-5 text-primary" />, text: "Real-time chat with photos, GIFs & voice notes" },
  { icon: <Users className="h-5 w-5 text-primary" />, text: "Voice & video calls, Virtual dates" },
  { icon: <Shield className="h-5 w-5 text-primary" />, text: "Discreet Legacy Mode, Safety Center, Block & Report" },
  { icon: <Zap className="h-5 w-5 text-primary" />, text: "Fluid Vibes Zone, In-app Events" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto px-4 h-20 flex items-center justify-between"
      >
        <Logo />
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="btn-press transition-transform">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild className="btn-press shadow-soft hover:shadow-card transition-shadow">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </motion.header>

      <main className="flex-grow">
        <section className="relative container mx-auto px-4 py-16 md:py-24 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-3xl mx-auto"
          >
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Ignite Connections with a<br />
              <motion.span
                className="text-primary inline-block"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Spark of AI
              </motion.span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-6 text-lg md:text-xl text-muted-foreground"
            >
              Welcome to Nue Flirt, the dating app that transforms your profile with captivating AI-generated videos. Experience a new, interactive way to meet people across India.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-8 flex justify-center gap-4"
            >
              <Button size="lg" asChild className="btn-press shadow-soft hover:shadow-glow-primary transition-all duration-300 rounded-xl">
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto rounded-2xl bg-card/60 backdrop-blur-sm border border-primary/10 p-6 md:p-8 shadow-soft"
          >
            <h3 className="text-xl font-headline font-semibold mb-4">About Nue Flirt</h3>
            <p className="text-muted-foreground mb-4">
              Nue Flirt is a modern dating app built for India. Transform your profile with AI-generated videos and avatars, 
              discover matches with smart filters (language, region, community, zodiac), and connect through chat, voice, and video calls. 
              Supports multiple languages (English, हिन्दी, తెలుగు, தமிழ்), offline mode, and PWA install.
            </p>
            <div className="space-y-2">
              {appFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {f.icon}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-headline font-bold">A New Era of Dating</h2>
              <p className="mt-4 text-muted-foreground">
                Go beyond static photos. Nue Flirt offers a dynamic and playful experience designed for modern Indian dating.
              </p>
            </motion.div>
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={item}>
                  <Card className="h-full text-center bg-card/80 backdrop-blur-sm border-primary/10 card-hover rounded-2xl overflow-hidden shadow-soft">
                    <CardHeader>
                      <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        {feature.icon}
                      </div>
                      <CardTitle className="font-headline pt-4">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-secondary/80 backdrop-blur-sm border-t border-border/50"
      >
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between">
          <Logo />
          <p className="text-muted-foreground text-sm mt-4 md:mt-0">&copy; {new Date().getFullYear()} Nue Flirt. All rights reserved.</p>
        </div>
      </motion.footer>
    </div>
  );
}
