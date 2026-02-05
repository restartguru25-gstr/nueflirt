'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Loader, Sparkles, Upload, Crown, Coins, Trash2, PlusCircle, ShieldCheck, Check, X, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp } from 'firebase/firestore';
import type { User, PromptAnswer, Subscription, CreditBalance } from '@/types';
import { generateAiAvatar } from '@/ai/flows/ai-avatar-creation';
import { generateProfileVideo } from '@/ai/flows/ai-profile-video-generation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { profilePrompts } from '@/lib/prompts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { indianLanguages, indianRegions, indianCommunities, casteOptions, datingIntents, allInterests, zodiacSigns, petOptions, smokingOptions, kidsOptions, orientationOptions, pronounOptions, heightOptions, educationOptions, drinkingOptions, exerciseOptions } from '@/lib/profile-options';
import { useLocale } from '@/contexts/locale-context';
import { useOfflineMyProfile } from '@/hooks/use-offline';
import { getCurrentPosition } from '@/lib/geo';
import { getZodiacMatchTagline } from '@/lib/zodiac';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell } from 'lucide-react';


function PromptEditor({ prompts, onPromptsChange, onSave }: { prompts: PromptAnswer[], onPromptsChange: (prompts: PromptAnswer[]) => void, onSave: () => void }) {
    const [openPopover, setOpenPopover] = useState(false);

    const availablePrompts = profilePrompts.filter(p => !prompts.some(pa => pa.prompt === p));

    const handleAddPrompt = (prompt: string) => {
        if (prompts.length < 3) {
            onPromptsChange([...prompts, { prompt, answer: '' }]);
        }
        setOpenPopover(false);
    };

    const handleUpdateAnswer = (index: number, answer: string) => {
        const newPrompts = [...prompts];
        newPrompts[index].answer = answer;
        onPromptsChange(newPrompts);
    };

    const handleRemovePrompt = (index: number) => {
        const newPrompts = prompts.filter((_, i) => i !== index);
        onPromptsChange(newPrompts);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Prompts</CardTitle>
                <CardDescription>Answer up to 3 prompts to show more of your personality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {prompts.map((p, index) => (
                    <div key={index} className="space-y-2">
                        <div className='flex justify-between items-center'>
                            <Label className='font-semibold'>{p.prompt}</Label>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemovePrompt(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        <Textarea
                            placeholder="Your answer..."
                            value={p.answer}
                            onChange={(e) => handleUpdateAnswer(index, e.target.value)}
                        />
                    </div>
                ))}

                {prompts.length < 3 && (
                    <Popover open={openPopover} onOpenChange={setOpenPopover}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add a prompt
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search prompts..." />
                                <CommandGroup>
                                <CommandList>
                                    <CommandEmpty>No prompts found.</CommandEmpty>
                                    
                                        {availablePrompts.map(p => (
                                            <CommandItem key={p} onSelect={() => handleAddPrompt(p)}>
                                                {p}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={onSave} className="w-full">Save Prompts</Button>
            </CardFooter>
        </Card>
    );
}

function PushNotificationButton() {
  const { requestPermission, isSupported, isEnabled, asking } = usePushNotifications();
  const { toast } = useToast();
  if (!isSupported) {
    return <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>;
  }
  if (isEnabled) {
    return <p className="text-sm text-green-600 dark:text-green-400">Push notifications are enabled. You&apos;ll get alerts for new matches and messages.</p>;
  }
  return (
    <Button variant="outline" disabled={asking} onClick={async () => {
      const ok = await requestPermission();
      if (ok) toast({ title: 'Notifications enabled', description: 'You\'ll receive push alerts for matches and messages.' });
      else toast({ variant: 'destructive', title: 'Permission denied', description: 'Enable notifications in browser settings to get alerts.' });
    }}>
      {asking ? 'Requesting...' : 'Enable push notifications'}
    </Button>
  );
}

function MultiSelectInterests({ selected, onSelect, onRemove }: { selected: string[], onSelect: (interest: string) => void, onRemove: (interest: string) => void }) {
    const [open, setOpen] = useState(false);
    const availableInterests = allInterests.filter(i => !selected.includes(i));
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {selected.map(interest => (
                    <Badge key={interest} variant="secondary" className="pr-1">
                        {interest}
                        <button onClick={() => onRemove(interest)} className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
                        Add interests...
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search interests..." />
                        <CommandList>
                            <CommandEmpty>No interest found.</CommandEmpty>
                            <CommandGroup>
                                {availableInterests.map(interest => (
                                    <CommandItem
                                        key={interest}
                                        onSelect={() => {
                                            onSelect(interest);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", selected.includes(interest) ? "opacity-100" : "opacity-0")} />
                                        {interest}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}


export default function ProfilePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'user_profiles', user.uid) : null, [firestore, user]);
    const subscriptionRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'subscriptions', user.uid) : null, [firestore, user]);
    const creditsRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'credit_balances', user.uid) : null, [firestore, user]);

    const { data: userData, isLoading: userLoading } = useDoc<any>(userRef);
    const { data: liveUserProfile, isLoading: profileLoading } = useDoc<User>(userProfileRef);
    const { data: userProfile, isLoading: profileLoadingFinal, isOffline } = useOfflineMyProfile(liveUserProfile, profileLoading);
    const { data: subscription, isLoading: subscriptionLoading } = useDoc<Subscription>(subscriptionRef);
    const { data: credits, isLoading: creditsLoading } = useDoc<CreditBalance>(creditsRef);

    const [isGenerating, setIsGenerating] = useState<'avatar' | 'video' | null>(null);
    const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [bio, setBio] = useState('');
    /** Up to 6 profile photos. First is used for avatar/teaser/AI generation. */
    const [images, setImages] = useState<string[]>([]);
    const [videoStyle, setVideoStyle] = useState<string>('modern');
    const MAX_PHOTOS = 6;

    // Profile fields state
    const [language, setLanguage] = useState('');
    const [region, setRegion] = useState('');
    const [community, setCommunity] = useState('');
    const [caste, setCaste] = useState('');
    const [datingIntent, setDatingIntent] = useState('');
    const [prompts, setPrompts] = useState<PromptAnswer[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [zodiac, setZodiac] = useState('');
    const [pets, setPets] = useState('');
    const [smoking, setSmoking] = useState('');
    const [kids, setKids] = useState('');
    const [orientation, setOrientation] = useState('');
    const [pronouns, setPronouns] = useState('');
    const [height, setHeight] = useState('');
    const [education, setEducation] = useState('');
    const [job, setJob] = useState('');
    const [drinking, setDrinking] = useState('');
    const [exercise, setExercise] = useState('');
    const [ageRangeMin, setAgeRangeMin] = useState<number>(18);
    const [ageRangeMax, setAgeRangeMax] = useState<number>(99);

    const trustScore = useMemo(() => {
        if (!userProfile) return 0;
        let score = 0;
        if (userProfile.bio && userProfile.bio.length > 20) score += 20;
        if (userProfile.images && userProfile.images.length > 0) score += Math.min(20, userProfile.images.length * 5);
        if (userProfile.promptAnswers && userProfile.promptAnswers.filter(p => p.answer.length > 0).length > 0) score += 20;
        if (userProfile.isVerified) score += 40;
        return score;
    }, [userProfile]);

    useEffect(() => {
        if (!isUserLoading && !user) router.push('/login');
    }, [user, isUserLoading, router]);

    useEffect(() => {
        if (userProfile) {
            setBio(userProfile.bio || '');
            setImages(userProfile.images?.length ? [...userProfile.images] : []);
            if(userProfile.teaserVideoUrl) setGeneratedVideo(userProfile.teaserVideoUrl);
            if(userProfile.avatarId) setGeneratedAvatar(userProfile.avatarId);
            setLanguage(userProfile.language || '');
            setRegion(userProfile.region || '');
            setCommunity(userProfile.community || '');
            setCaste(userProfile.caste || '');
            setDatingIntent(userProfile.datingIntent || '');
            setPrompts(userProfile.promptAnswers || []);
            setInterests(userProfile.interests || []);
            setZodiac(userProfile.zodiac || '');
            setPets(userProfile.pets || '');
            setSmoking(userProfile.smoking || '');
            setKids(userProfile.kids || '');
            setOrientation(userProfile.orientation || '');
            setPronouns(userProfile.pronouns || '');
            setHeight(userProfile.height || '');
            setEducation(userProfile.education || '');
            setJob(userProfile.job || '');
            setDrinking(userProfile.drinking || '');
            setExercise(userProfile.exercise || '');
            setAgeRangeMin(userProfile.ageRangeMin ?? 18);
            setAgeRangeMax(userProfile.ageRangeMax ?? 99);
        }
    }, [userProfile]);

    const handleProfileFilterSave = () => {
        if (userProfileRef) {
            updateDocumentNonBlocking(userProfileRef, { language, region, community, caste: caste || undefined, datingIntent });
            toast({ title: t('profile.preferencesSaved') });
        }
    };

    const handleDiscoverySave = () => {
        if (userProfileRef) {
            const min = Math.max(18, Math.min(99, ageRangeMin));
            const max = Math.max(18, Math.min(99, ageRangeMax));
            const finalMin = Math.min(min, max);
            const finalMax = Math.max(min, max);
            updateDocumentNonBlocking(userProfileRef, { ageRangeMin: finalMin, ageRangeMax: finalMax });
            setAgeRangeMin(finalMin);
            setAgeRangeMax(finalMax);
            toast({ title: t('profile.discoverySaved') });
        }
    };

    const handleLifestyleSave = () => {
        if (userProfileRef) {
            updateDocumentNonBlocking(userProfileRef, { interests, zodiac, pets, smoking, kids, orientation, pronouns, height, education, job, drinking, exercise });
            toast({ title: "Lifestyle Info Saved!" });
        }
    };
    
    const handlePromptsSave = () => {
        if (userProfileRef) {
            const finalPrompts = prompts.filter(p => p.answer.trim() !== '');
            updateDocumentNonBlocking(userProfileRef, { promptAnswers: finalPrompts });
            toast({ title: "Prompts Saved!" });
        }
    };

    const verificationStatus = userProfile?.verificationStatus ?? 'none';
    const verificationPhotoUrl = userProfile?.verificationPhotoUrl;

    const handleVerificationPhotoSubmit = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userProfileRef) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUri = ev.target?.result as string;
            updateDocumentNonBlocking(userProfileRef, {
                verificationStatus: 'pending',
                verificationPhotoUrl: dataUri,
            });
            toast({ title: 'Verification submitted', description: 'Your selfie is under review. We\'ll notify you when verified.' });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length || !userProfileRef || images.length >= MAX_PHOTOS) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const dataUri = loadEvent.target?.result as string;
            const newImages = [...images, dataUri].slice(0, MAX_PHOTOS);
            setImages(newImages);
            updateDocumentNonBlocking(userProfileRef, { images: newImages });
            toast({ title: 'Photo added!' });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemovePhoto = (index: number) => {
        if (!userProfileRef) return;
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        updateDocumentNonBlocking(userProfileRef, { images: newImages });
        toast({ title: 'Photo removed.' });
    };

    const handleUpdateLocation = () => {
        if (!userProfileRef) return;
        getCurrentPosition()
            .then(({ latitude, longitude }) => {
                updateDocumentNonBlocking(userProfileRef!, { latitude, longitude });
                toast({ title: 'Location updated', description: 'Discovery can now use distance-based matching.' });
            })
            .catch(() => toast({ variant: 'destructive', title: 'Could not get location', description: 'Allow location access in browser settings.' }));
    };
    
    const handleGenerateAvatar = async () => {
        const photoDataUri = images[0];
        if (!photoDataUri) {
            toast({ variant: 'destructive', title: 'Upload a photo first' });
            return;
        }
        setIsGenerating('avatar');
        try {
            const result = await generateAiAvatar({ photoDataUri });
            setGeneratedAvatar(result.avatarDataUri);
            if (userProfileRef) updateDocumentNonBlocking(userProfileRef, { avatarId: result.avatarDataUri });
            toast({ title: 'Avatar Generation Started!' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Avatar Generation Failed' });
        } finally {
            setIsGenerating(null);
        }
    };

    const handleGenerateVideo = async () => {
        const photoDataUri = images[0];
        if (!photoDataUri) {
             toast({ variant: 'destructive', title: 'Upload a photo first' });
            return;
        }
        setIsGenerating('video');
        try {
            const result = await generateProfileVideo({ photoDataUri, style: videoStyle });
            setGeneratedVideo(result.videoDataUri);
            if (userProfileRef) updateDocumentNonBlocking(userProfileRef, { teaserVideoUrl: result.videoDataUri });
            toast({ title: 'Video Generation Started!' });
        } catch (error) {
            console.error(error);
             toast({ variant: 'destructive', title: 'Video Generation Failed' });
        } finally {
            setIsGenerating(null);
        }
    };

    const handleBioSave = () => {
        if (userProfileRef) {
            updateDocumentNonBlocking(userProfileRef, { bio });
            toast({ title: "Bio Saved!" });
        }
    };

    const handleExplicitContentToggle = (checked: boolean) => {
        if (userRef) updateDocumentNonBlocking(userRef, { explicitContentOptIn: checked });
    };

    const handleBoostProfile = () => {
        if (!userProfileRef) return;
    
        if (subscription?.planType !== 'premium' && (credits?.balance || 0) < 1) {
          toast({
            variant: "destructive",
            title: "Not enough credits",
            description: "You need to be a premium member or have credits to boost your profile.",
          });
          return;
        }
    
        const boostedUntil = new Date();
        boostedUntil.setMinutes(boostedUntil.getMinutes() + 30);
    
        updateDocumentNonBlocking(userProfileRef, { boostedUntil: serverTimestamp() });
    
        // In a real app, you would deduct a credit here via a server-side function
        // For now, we just show a toast.
    
        toast({
          title: "Profile Boosted!",
          description: "Your profile will be shown to more people for the next 30 minutes.",
        });
      };
    
    const isLoading = isUserLoading || profileLoadingFinal || userLoading || subscriptionLoading || creditsLoading;

    if (isLoading) return <AppLayout><div>Loading profile...</div></AppLayout>;
    if (!userProfile) return <AppLayout><div>Could not load profile.</div></AppLayout>;

    return (
        <AppLayout>
            <div className="space-y-8">
                {isOffline && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">You&apos;re viewing cached profile. Changes will sync when back online.</p>
                )}
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t('profile.myProfile')}</h1>
                    <p className="text-muted-foreground">{t('profile.manageProfile')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <Card>
                            <CardHeader className="items-center text-center">
                                <div className="space-y-3">
                                    <div className="relative w-32 h-32 mx-auto">
                                        <Avatar className="w-full h-full text-4xl">
                                            <AvatarImage src={images[0]} alt={userProfile.name} />
                                            <AvatarFallback>{userProfile.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                                        {images.map((src, i) => (
                                            <div key={i} className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                <Button type="button" size="icon" variant="destructive" className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full opacity-90" onClick={() => handleRemovePhoto(i)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        {images.length < MAX_PHOTOS && (
                                            <button type="button" className="aspect-square w-full rounded-lg border-2 border-dashed flex items-center justify-center hover:bg-muted/50" onClick={() => fileInputRef.current?.click()}>
                                                <Edit className="h-5 w-5 text-muted-foreground" />
                                            </button>
                                        )}
                                    </div>
                                    <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />
                                    <p className="text-xs text-muted-foreground">{images.length}/{MAX_PHOTOS} photos</p>
                                </div>
                                <CardTitle className="pt-4">{userProfile.name}, {userProfile.age}</CardTitle>
                                <CardDescription>{userProfile.location}</CardDescription>
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleUpdateLocation}>
                                    Use my location (GPS)
                                </Button>
                            </CardHeader>
                            <CardContent className='space-y-2'>
                                <Textarea placeholder="Your bio..." value={bio} onChange={(e) => setBio(e.target.value)} />
                                <Button onClick={handleBioSave} size="sm" className="w-full">Save Bio</Button>
                            </CardContent>
                        </Card>
                        
                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ShieldCheck className='text-green-500'/> Verification &amp; Trust</CardTitle>
                                <CardDescription>Verify with a selfie to increase trust and visibility.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <p className="font-medium">Trust Score</p>
                                        <p className="font-bold text-primary">{trustScore}%</p>
                                    </div>
                                    <Progress value={trustScore} />
                                </div>
                                {userProfile.isVerified || verificationStatus === 'approved' ? (
                                    <div className='flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800'>
                                        <ShieldCheck className='h-5 w-5' />
                                        <p className='font-semibold text-sm'>You are a verified user</p>
                                    </div>
                                ) : verificationStatus === 'pending' ? (
                                    <div className='flex flex-col items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800'>
                                        {verificationPhotoUrl && (
                                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-300">
                                                <img src={verificationPhotoUrl} alt="Verification" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <p className='font-semibold text-sm'>Under review</p>
                                        <p className='text-xs'>We&apos;ll verify your selfie and update your badge soon.</p>
                                    </div>
                                ) : verificationStatus === 'rejected' ? (
                                    <>
                                        <div className='p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20'>
                                            <p className='font-semibold text-sm'>Verification rejected</p>
                                            <p className='text-xs mt-1'>Please submit a clearer selfie matching your profile photos.</p>
                                        </div>
                                        <Input type="file" id="verification-resubmit" className="hidden" accept="image/*" onChange={handleVerificationPhotoSubmit} />
                                        <Button variant="outline" className="w-full" onClick={() => document.getElementById('verification-resubmit')?.click()}>
                                            Resubmit selfie
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-muted-foreground text-center">Upload a selfie that clearly shows your face. It will be compared with your profile photos.</p>
                                        <Input type="file" id="verification-photo" className="hidden" accept="image/*" onChange={handleVerificationPhotoSubmit} />
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => document.getElementById('verification-photo')?.click()}>
                                            <ShieldCheck className="mr-2 h-4 w-4"/> Submit selfie for verification
                                        </Button>
                                    </>
                                )}
                                <div className="pt-4 border-t space-y-2">
                                    <p className="font-medium text-sm">ID Verification</p>
                                    {userProfile.idVerificationStatus === 'verified' ? (
                                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> ID verified</p>
                                    ) : userProfile.idVerificationStatus === 'pending' ? (
                                        <p className="text-sm text-amber-600 dark:text-amber-400">ID verification under review.</p>
                                    ) : (
                                        <>
                                            <p className="text-xs text-muted-foreground">Verify your identity for an ID verified badge.</p>
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => { if (userProfileRef) { updateDocumentNonBlocking(userProfileRef, { idVerificationStatus: 'pending' }); toast({ title: 'ID verification submitted', description: 'We\'ll review your ID. This is a placeholder flow.' }); } }}>
                                                Verify with ID
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <div className="pt-2">
                                    <Link href="/safety" className="text-xs text-primary hover:underline">{t('safety.title')}</Link>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">A higher trust score improves your match potential. Complete your profile and get verified.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Push Notifications</CardTitle>
                                <CardDescription>Get notified for new matches and messages.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PushNotificationButton />
                            </CardContent>
                        </Card>

                        <PromptEditor prompts={prompts} onPromptsChange={setPrompts} onSave={handlePromptsSave} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Preferences</CardTitle>
                                <CardDescription>Help us find better matches for you.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Dating Intent</Label>
                                    <Select value={datingIntent} onValueChange={setDatingIntent}>
                                        <SelectTrigger><SelectValue placeholder="Select Intent" /></SelectTrigger>
                                        <SelectContent>{datingIntents.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
                                        <SelectContent>{indianLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Region</Label>
                                    <Select value={region} onValueChange={setRegion}>
                                        <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                                        <SelectContent>{indianRegions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('dashboard.community')}</Label>
                                    <Select value={community} onValueChange={setCommunity}>
                                        <SelectTrigger><SelectValue placeholder={t('profile.selectCommunity')} /></SelectTrigger>
                                        <SelectContent>{indianCommunities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('dashboard.caste')}</Label>
                                    <Select value={caste} onValueChange={setCaste}>
                                        <SelectTrigger><SelectValue placeholder={t('signup.selectCaste')} /></SelectTrigger>
                                        <SelectContent>{casteOptions.filter(c => c !== 'Any').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleProfileFilterSave} className="w-full">{t('profile.savePreferences')}</Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Discovery</CardTitle>
                                <CardDescription>Age range for people you want to see.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min age</Label>
                                        <Input type="number" min={18} max={99} value={ageRangeMin} onChange={(e) => setAgeRangeMin(Number(e.target.value) || 18)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max age</Label>
                                        <Input type="number" min={18} max={99} value={ageRangeMax} onChange={(e) => setAgeRangeMax(Number(e.target.value) || 99)} />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleDiscoverySave} className="w-full">Save age range</Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Interests &amp; Lifestyle</CardTitle>
                                <CardDescription>Select your interests and lifestyle preferences to find better matches.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Interests (select up to 5)</Label>
                                    <MultiSelectInterests
                                        selected={interests}
                                        onSelect={(interest) => {
                                            if (interests.length < 5) setInterests([...interests, interest]);
                                        }}
                                        onRemove={(interest) => {
                                            setInterests(interests.filter(i => i !== interest));
                                        }}
                                    />
                                </div>
                                <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label>Zodiac Sign</Label>
                                    <Select value={zodiac} onValueChange={setZodiac}><SelectTrigger><SelectValue placeholder="Select your sign" /></SelectTrigger>
                                        <SelectContent>{zodiacSigns.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {zodiac && getZodiacMatchTagline(zodiac) && (
                                        <p className="text-xs text-muted-foreground">Horoscope match: {getZodiacMatchTagline(zodiac)}</p>
                                    )}
                                </div>
                                    <div className="space-y-2">
                                        <Label>Pets</Label>
                                        <Select value={pets} onValueChange={setPets}><SelectTrigger><SelectValue placeholder="Your preference" /></SelectTrigger>
                                            <SelectContent>{petOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Smoking</Label>
                                    <Select value={smoking} onValueChange={setSmoking}><SelectTrigger><SelectValue placeholder="Your preference" /></SelectTrigger>
                                        <SelectContent>{smokingOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Kids</Label>
                                    <Select value={kids} onValueChange={setKids}><SelectTrigger><SelectValue placeholder="Your preference" /></SelectTrigger>
                                        <SelectContent>{kidsOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Orientation</Label>
                                    <Select value={orientation} onValueChange={setOrientation}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{orientationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pronouns</Label>
                                    <Select value={pronouns} onValueChange={setPronouns}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{pronounOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Height</Label>
                                    <Select value={height} onValueChange={setHeight}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{heightOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Education</Label>
                                    <Select value={education} onValueChange={setEducation}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{educationOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Job / Profession</Label>
                                    <Input placeholder="e.g. Software Engineer" value={job} onChange={(e) => setJob(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Drinking</Label>
                                    <Select value={drinking} onValueChange={setDrinking}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{drinkingOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Exercise</Label>
                                    <Select value={exercise} onValueChange={setExercise}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                                        <SelectContent>{exerciseOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleLifestyleSave} className="w-full">Save Interests &amp; Lifestyle</Button>
                            </CardFooter>
                        </Card>


                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center"><Sparkles className="h-5 w-5 mr-2 text-primary"/> AI Studio</CardTitle>
                                <CardDescription>Bring your profile to life. Upload a photo to generate a unique avatar and video.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 border-2 border-dashed rounded-lg text-center">
                                    {images[0] ? (
                                        <div className="relative aspect-square max-w-[200px] mx-auto">
                                            <Image src={images[0]} alt="Primary photo for AI" width={200} height={200} className="rounded-lg object-cover w-full h-full" />
                                        </div>
                                    ) : (
                                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                    )}
                                    <h3 className="mt-2 text-sm font-medium">First photo is used for AI avatar &amp; video</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">Add photos above (up to {MAX_PHOTOS}). PNG, JPG up to 10MB.</p>
                                     <Button variant="outline" size="sm" className="mt-4" onClick={() => fileInputRef.current?.click()} disabled={images.length >= MAX_PHOTOS}>
                                        {images.length >= MAX_PHOTOS ? 'Max photos reached' : 'Add photo'}
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold">Generate AI Avatar</h4>
                                        <div className="aspect-square w-full bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                                            {generatedAvatar ? (
                                                <Image src={generatedAvatar} alt="Generated Avatar" width={400} height={400} className="object-cover w-full h-full"/>
                                            ) : (
                                                <Sparkles className="h-16 w-16 text-muted-foreground/50"/>
                                            )}
                                        </div>
                                        <Button className="w-full" onClick={handleGenerateAvatar} disabled={!!isGenerating}>
                                            {isGenerating === 'avatar' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                            {isGenerating === 'avatar' ? 'Generating...' : 'Generate Avatar'}
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-semibold">Generate AI Video</h4>
                                        <div className="aspect-square w-full bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                                            {generatedVideo ? (
                                                 <video key={generatedVideo} className="h-full w-full object-cover rounded-lg" autoPlay loop muted playsInline>
                                                    <source src={generatedVideo} type="video/mp4" />
                                                </video>
                                            ) : (
                                                <Sparkles className="h-16 w-16 text-muted-foreground/50"/>
                                            )}
                                        </div>
                                        <Select value={videoStyle} onValueChange={setVideoStyle}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select video style" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="modern">Modern</SelectItem>
                                                <SelectItem value="traditional Indian">Traditional Indian</SelectItem>
                                                <SelectItem value="cinematic">Cinematic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button className="w-full" onClick={handleGenerateVideo} disabled={!!isGenerating}>
                                            {isGenerating === 'video' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                            {isGenerating === 'video' ? 'Generating...' : 'Generate Video'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={handleBoostProfile} className="w-full bg-purple-600 hover:bg-purple-700">
                                    <Zap className="mr-2 h-4 w-4"/> Boost My Profile
                                </Button>
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Crown className="h-6 w-6 text-amber-500" />
                                        <div>
                                            <p className="font-semibold">Subscription</p>
                                            <p className="text-sm capitalize text-muted-foreground">{subscription?.planType || 'Free'} Plan</p>
                                        </div>
                                    </div>
                                    <Button asChild variant="secondary" size="sm"><Link href="/subscribe">Manage</Link></Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Coins className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="font-semibold">AI Credits</p>
                                            <p className="text-sm text-muted-foreground">{credits?.balance || 0} remaining</p>
                                        </div>
                                    </div>
                                    <Button asChild variant="secondary" size="sm"><Link href="/subscribe">Buy More</Link></Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle>Content Preferences</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="explicit-content" className="flex flex-col space-y-1">
                                        <span>Interactive Reveals</span>
                                        <span className="font-normal leading-snug text-muted-foreground">
                                            Enable to view and generate AI-powered interactive reveals. (18+)
                                        </span>
                                    </Label>
                                    <Switch id="explicit-content" checked={userData?.explicitContentOptIn} onCheckedChange={handleExplicitContentToggle} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
