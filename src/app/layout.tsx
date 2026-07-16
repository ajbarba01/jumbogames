/**
 * Root layout: global fonts (the Toasted Arcade voices, self-hosted via
 * next/font), metadata, the hand-drawn doodle background, and the app-wide
 * HTML shell every page renders inside.
 */
import type { Metadata } from "next";
import {
  Archivo_Black,
  Gaegu,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import "./globals.css";
import { Doodles } from "./doodles";
import { WipeProvider } from "@/components/wipe/WipeProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: "700",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jumbogames",
  description:
    "Team-based tournament of co-operative minigames for JumboCode hacknights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${archivoBlack.variable} ${gaegu.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Doodles />
        <WipeProvider>{children}</WipeProvider>
      </body>
    </html>
  );
}
