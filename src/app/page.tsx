import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Film, Sparkles, Wind } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from '@/lib/placeholder-images';

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

const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </header>

      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Ignite Connections with a<br /> <span className="text-primary">Spark of AI</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground">
              Welcome to Nue Flirt, the dating app that transforms your profile with captivating AI-generated videos. Experience a new, interactive way to meet people across India.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4">
          {heroImage && (
            <div className="relative aspect-[16/9] md:aspect-[2/1] w-full max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
              <Image 
                src={heroImage.imageUrl} 
                alt={heroImage.description} 
                data-ai-hint={heroImage.imageHint}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>
          )}
        </section>

        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-headline font-bold">A New Era of Dating</h2>
              <p className="mt-4 text-muted-foreground">
                Go beyond static photos. Nue Flirt offers a dynamic and playful experience designed for modern Indian dating.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center bg-card/80 backdrop-blur-sm border-primary/10">
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
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between">
          <Logo />
          <p className="text-muted-foreground text-sm mt-4 md:mt-0">&copy; {new Date().getFullYear()} Nue Flirt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
