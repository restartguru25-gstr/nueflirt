"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AuthLayout } from "@/components/auth-layout"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from "@/firebase"
import { initiateEmailSignUp, initiateGoogleSignIn, initiateFacebookSignIn, initiateAppleSignIn } from "@/firebase/non-blocking-login"
import { doc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import {
  indianLanguages,
  indianRegions,
  indianCommunities,
  casteOptions,
  relationshipStatusOptions,
  relationshipStatusLabels,
  zodiacSigns,
  orientationOptions,
  pronounOptions,
  heightOptions,
  educationOptions,
  drinkingOptions,
  exerciseOptions,
} from '@/lib/profile-options';

// A simple SVG for Google icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.258,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
)

// A simple SVG for Facebook icon
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 24 24" {...props}>
        <path fill="#3b5998" d="M12,2C6.477,2,2,6.477,2,12c0,5.013,3.693,9.153,8.505,9.876V14.69H8.031v-2.822h2.474v-2.18c0-2.45,1.442-3.793,3.675-3.793c1.06,0,2.162,0.188,2.162,0.188v2.531h-1.32c-1.21,0-1.59,0.762-1.59,1.52v1.724h2.83l-0.455,2.822h-2.375v7.186C18.307,21.153,22,17.013,22,12C22,6.477,17.523,2,12,2z"></path>
    </svg>
)

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-1.15 1.94-2.31 3.83-4.55 5.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
)

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  dob: z.string().refine((val) => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if(!regex.test(val)) return false;
    const [day, month, year] = val.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, {
    message: "Please enter a valid date in DD/MM/YYYY format.",
  }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  location: z.string().min(2, { message: "Please enter your city." }),
  gender: z.string({ required_error: "Please select your gender." }),
  preferences: z.string({ required_error: "Please select your preference." }),
  datingIntent: z.string({ required_error: "Please select your dating intention." }),
  language: z.string().optional(),
  region: z.string().optional(),
  community: z.string().optional(),
  caste: z.string().optional(),
  zodiac: z.string().optional(),
  orientation: z.string().optional(),
  pronouns: z.string().optional(),
  height: z.string().optional(),
  education: z.string().optional(),
  job: z.string().optional(),
  drinking: z.string().optional(),
  exercise: z.string().optional(),
  relationshipStatus: z.string().optional(),
}).refine(data => {
  const [day, month, year] = data.dob.split('/').map(Number);
  const dobDate = new Date(year, month - 1, day);
  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return dobDate <= eighteenYearsAgo;
}, {
  message: "You must be at least 18 years old.",
  path: ["dob"],
});


export default function SignupPage() {
  const router = useRouter()
  const auth = useAuth()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      dob: "",
      location: "",
      language: "",
      region: "",
      community: "",
      caste: "",
      zodiac: "",
      orientation: "",
      pronouns: "",
      height: "",
      education: "",
      job: "",
      drinking: "",
      exercise: "",
      relationshipStatus: "",
    },
  })

  const { isSubmitSuccessful } = form.formState

  useEffect(() => {
    if (!isUserLoading && user && isSubmitSuccessful) {
      if (!firestore) return;
      const values = form.getValues();
      const [day, month, year] = values.dob.split('/').map(Number);
      const dob = new Date(year, month - 1, day);

      if (!dob) return;
      
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
      }
      
      const userData = {
        id: user.uid,
        email: user.email,
        age: age,
        gender: values.gender,
        preferences: values.preferences,
        location: values.location,
        profileId: user.uid,
        explicitContentOptIn: false,
        datingIntent: values.datingIntent,
      }
      
      const userProfileData = {
        id: user.uid,
        userId: user.uid,
        name: values.fullName,
        age: age,
        gender: values.gender,
        preferences: values.preferences,
        location: values.location,
        bio: "",
        interests: [],
        photos: user.photoURL ? [user.photoURL] : [],
        avatarId: "",
        language: values.language || "",
        region: values.region || "",
        community: values.community || "",
        caste: values.caste || "",
        datingIntent: values.datingIntent,
        promptAnswers: [],
        zodiac: values.zodiac || "",
        orientation: values.orientation || "",
        pronouns: values.pronouns || "",
        height: values.height || "",
        education: values.education || "",
        job: values.job || "",
        drinking: values.drinking || "",
        exercise: values.exercise || "",
        relationshipStatus: values.relationshipStatus || undefined,
      }

      const userRef = doc(firestore, "users", user.uid);
      const userProfileRef = doc(firestore, "user_profiles", user.uid);
      const subscriptionRef = doc(firestore, "subscriptions", user.uid);
      const creditsRef = doc(firestore, "credit_balances", user.uid);

      setDocumentNonBlocking(userRef, userData, { merge: true });
      setDocumentNonBlocking(userProfileRef, userProfileData, { merge: true });
      setDocumentNonBlocking(subscriptionRef, {
        userId: user.uid,
        planType: 'free',
        startDate: new Date(),
        endDate: null
      }, { merge: true });
      setDocumentNonBlocking(creditsRef, {
        userId: user.uid,
        balance: 10,
      }, { merge: true });

      router.push("/dashboard")
    }
  }, [user, isUserLoading, isSubmitSuccessful, router, form, firestore])

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) return;
    setIsSigningUp(true);
    initiateEmailSignUp(auth, values.email, values.password, () => {
      setIsSigningUp(false);
    })
  }

  if (!auth || !firestore) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground mt-2">If this takes too long, refresh the page.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
           <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Priya Patel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="priya@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input placeholder="DD/MM/YYYY" {...field} />
                </FormControl>
                <FormDescription>
                  You must be 18 or older to use Nue Flirt.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Mumbai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>You identify as...</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Woman" />
                      </FormControl>
                      <FormLabel className="font-normal">Woman</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Man" />
                      </FormControl>
                      <FormLabel className="font-normal">Man</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="preferences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>You're interested in...</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who you'd like to meet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Men">Men</SelectItem>
                    <SelectItem value="Women">Women</SelectItem>
                    <SelectItem value="Everyone">Everyone</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="datingIntent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>You're looking for...</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your dating intention" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Casual">Something casual</SelectItem>
                    <SelectItem value="Serious">A serious relationship</SelectItem>
                    <SelectItem value="Marriage">Marriage</SelectItem>
                    <SelectItem value="Figuring it out">Still figuring it out</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="zodiac"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zodiac Sign <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your zodiac sign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zodiacSigns.map(sign => <SelectItem key={sign} value={sign}>{sign}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Language <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {indianLanguages.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {indianRegions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="community"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Religion / Community <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your community" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {indianCommunities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="caste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caste <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select caste (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {casteOptions.filter(c => c !== 'Any').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relationshipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship status <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {relationshipStatusOptions.map(s => <SelectItem key={s} value={s}>{relationshipStatusLabels[s] ?? s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="orientation" render={({ field }) => (
              <FormItem>
                <FormLabel>Orientation <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{orientationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pronouns" render={({ field }) => (
              <FormItem>
                <FormLabel>Pronouns <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{pronounOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="height" render={({ field }) => (
              <FormItem>
                <FormLabel>Height <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{heightOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="education" render={({ field }) => (
              <FormItem>
                <FormLabel>Education <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{educationOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="job" render={({ field }) => (
              <FormItem>
                <FormLabel>Job / Profession <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. Software Engineer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="drinking" render={({ field }) => (
              <FormItem>
                <FormLabel>Drinking <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{drinkingOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="exercise" render={({ field }) => (
              <FormItem>
                <FormLabel>Exercise <span className="text-muted-foreground">(Optional)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>{exerciseOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSigningUp}>
            {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSigningUp ? 'Creating Account...' : 'Create an account'}
          </Button>
        </form>
      </Form>

       <Separator className="my-2" />
      <p className="text-sm text-muted-foreground text-center">Or sign up with</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button type="button" variant="outline" disabled={!!isOAuthLoading} onClick={() => { if (!auth) return; setIsOAuthLoading('google'); initiateGoogleSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
          Google
        </Button>
        <Button type="button" variant="outline" disabled={!!isOAuthLoading} onClick={() => { if (!auth) return; setIsOAuthLoading('facebook'); initiateFacebookSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'facebook' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FacebookIcon className="mr-2 h-4 w-4" />}
          Facebook
        </Button>
        <Button type="button" variant="outline" disabled={!!isOAuthLoading} onClick={() => { if (!auth) return; setIsOAuthLoading('apple'); initiateAppleSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'apple' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon className="mr-2 h-4 w-4" />}
          Apple
        </Button>
      </div>

      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </div>
    </AuthLayout>
  )
}

    
