import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <Logo className="justify-center" size="large" />
          </div>
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {heroImage && (
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                data-ai-hint={heroImage.imageHint}
                fill
                className="object-cover"
            />
        )}
         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>
    </div>
  );
}
