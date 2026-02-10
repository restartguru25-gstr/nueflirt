'use client';

import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureTile, DETAILED_FEATURES } from "@/components/feature-tile";

const authFeaturesSubset = DETAILED_FEATURES.slice(0, 5);

const SIDE_PANEL_INNER_CLASS = "max-w-md mx-auto w-full space-y-8";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="grid gap-6 text-center mb-6">
            <Logo className="justify-center" size="large" />
          </div>
          <Card className="border-border/60 shadow-soft bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6 pb-6 px-6">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 border-l border-border/50 p-12 xl:p-16 overflow-auto">
        <div className={SIDE_PANEL_INNER_CLASS}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Welcome to</p>
            <h2 className="font-brand text-2xl xl:text-3xl font-bold text-foreground mt-1">Find your spark.</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Join India’s dating app with AI videos, smart filters, and real connection.
            </p>
          </div>
          <div className="space-y-3">
            {mounted &&
              authFeaturesSubset.map((f, i) => (
                <FeatureTile key={f.title} feature={f} index={i} compact />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
