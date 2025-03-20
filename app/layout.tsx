import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Feetdle - The Daily Feet Guessing Game",
  description: "Feetdle is a daily guessing game where you identify feet. Test your knowledge and embrace your inner freak with new challenges every day!",
  applicationName: "Feetdle",
  authors: [{ name: "ProduceItem", url: "https://produceitem.xyz" }],
  keywords: ["feetdle", "foot guessing game", "daily puzzle", "foot game", "guessing game"],
  creator: "ProduceItem",
  publisher: "ProduceItem",
  metadataBase: new URL("https://feetdle.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { 
        url: '/favicon.svg', 
        type: 'image/svg+xml',
        sizes: 'any' 
      },
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👣</text></svg>',
        type: 'image/svg+xml',
      },
    ],
    shortcut: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://feetdle.com",
    title: "Feetdle - The Daily Feet Guessing Game",
    description: "Test your knowledge and guess the feet of the day! A new challenge every 24 hours.",
    siteName: "Feetdle",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
        alt: "Feetdle - The Daily Feet Guessing Game"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feetdle - The Daily Feet Guessing Game",
    description: "Test your knowledge and guess the feet of the day! A new challenge every 24 hours.",
    images: ["/twitter-image.png"],
    creator: "@produceitem",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2114112298508670"crossOrigin="anonymous"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
