import type { Metadata } from "next";
import { Poppins, Rozha_One, Noto_Sans_Tamil } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const rozhaOne = Rozha_One({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fresh Nalla Kadai — Order Fresh Organic Produce",
  description: "Weekly pre-ordering system for farm-fresh organic vegetables, greens, fruits and dairy from Nalla Kadai.",
  icons: {
    icon: "/images/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${rozhaOne.variable} ${notoSansTamil.variable}`}
    >
      <body suppressHydrationWarning className="antialiased min-h-screen bg-background text-foreground">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
