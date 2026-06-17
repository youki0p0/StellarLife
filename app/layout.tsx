import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Life",
  description:
    "宇宙へ行く人生すごろく。学校から始まり、軌道・月・火星・深宇宙へ。最も伝説的な人生を歩んだ者が勝者。",
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="font-pixel antialiased">
        <div className="starfield" aria-hidden />
        {children}
      </body>
    </html>
  );
}
