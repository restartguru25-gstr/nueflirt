"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { AuthLayout } from "@/components/auth-layout"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useAuth, useUser } from "@/firebase"
import { initiateEmailSignIn, initiateGoogleSignIn, initiateFacebookSignIn, initiateAppleSignIn, createPhoneRecaptcha, sendPhoneOtp, confirmPhoneOtp } from "@/firebase/non-blocking-login"
import type { ConfirmationResult } from "firebase/auth"
import { Loader2, Phone } from "lucide-react"

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

// Apple icon
const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-1.15 1.94-2.31 3.83-4.55 5.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
)

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isUserLoading, router])

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoggingIn(true);
    initiateEmailSignIn(auth, values.email, values.password, () => {
      setIsLoggingIn(false);
    });
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Password</FormLabel>
                  <Link href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Form>
      <Separator className="my-2" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button type="button" variant="outline" disabled={!!isOAuthLoading || !auth} onClick={() => { if (!auth) return; setIsOAuthLoading('google'); initiateGoogleSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
          Google
        </Button>
        <Button type="button" variant="outline" disabled={!!isOAuthLoading || !auth} onClick={() => { if (!auth) return; setIsOAuthLoading('facebook'); initiateFacebookSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'facebook' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FacebookIcon className="mr-2 h-4 w-4" />}
          Facebook
        </Button>
        <Button type="button" variant="outline" disabled={!!isOAuthLoading || !auth} onClick={() => { if (!auth) return; setIsOAuthLoading('apple'); initiateAppleSignIn(auth, () => setIsOAuthLoading(null)); }}>
          {isOAuthLoading === 'apple' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon className="mr-2 h-4 w-4" />}
          Apple
        </Button>
      </div>
      <Separator className="my-4" />
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Or sign in with phone (India)</p>
        <div id="recaptcha-phone" ref={recaptchaRef} className="min-h-[1px]" />
        {phoneStep === 'phone' ? (
          <div className="flex gap-2">
            <Input
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!auth || phoneLoading || !phoneNumber.trim()}
              onClick={async () => {
                if (!auth || !recaptchaRef.current) return;
                setPhoneLoading(true);
                try {
                  const verifier = createPhoneRecaptcha(auth, recaptchaRef.current);
                  const normalized = phoneNumber.trim().startsWith('+') ? phoneNumber.trim() : `+91${phoneNumber.replace(/\D/g, '')}`;
                  const result = await sendPhoneOtp(auth, normalized, verifier);
                  confirmationResultRef.current = result;
                  setPhoneStep('otp');
                  setOtp('');
                } catch (e) {
                  console.error(e);
                } finally {
                  setPhoneLoading(false);
                }
              }}
            >
              {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="flex-1"
            />
            <Button
              type="button"
              disabled={!confirmationResultRef.current || otp.length !== 6 || phoneLoading}
              onClick={() => {
                const result = confirmationResultRef.current;
                if (!result || otp.length !== 6) return;
                setPhoneLoading(true);
                confirmPhoneOtp(result, otp, () => setPhoneLoading(false));
              }}
            >
              {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPhoneStep('phone'); confirmationResultRef.current = null; }}>Change number</Button>
          </div>
        )}
      </div>
      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  )
}
