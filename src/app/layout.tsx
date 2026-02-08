import "./globals.css";
import AuroraBackground from "@/components/AuroraBackground";
import { JetBrains_Mono, Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Sophisticate",
  description: "Video crop and compress in the browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`relative min-h-screen ${manrope.variable} ${jetbrainsMono.variable}`}>
        <AuroraBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
