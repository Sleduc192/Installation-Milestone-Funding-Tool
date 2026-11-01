import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { BackToHub } from '@/components/back-to-hub'
import { Providers } from '@/components/providers'
import { basePath } from '@/lib/base-path'

export const dynamic = "force-dynamic";

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

function metadataOrigin(): string {
  try {
    return new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

const publicOrigin = `${metadataOrigin()}${basePath()}`;

export const metadata = {
  // Include the mount path so /favicon.svg and /og-image.png resolve under it.
  // Next joins metadata paths onto metadataBase and drops a leading slash.
  metadataBase: new URL(`${publicOrigin}/`),
  title: "LightReach M1 Submission Tool",
  description: "AI-powered solar installation photo review and submission management",
  icons: {
    icon: "favicon.svg",
    shortcut: "favicon.svg",
  },
  openGraph: {
    title: "LightReach M1 Submission Tool",
    description: "AI-powered solar installation photo review and submission management",
    images: ["og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <BackToHub />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            {children}
          </Providers>
          <Toaster />
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
