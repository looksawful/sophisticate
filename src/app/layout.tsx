import "./globals.css";

export const metadata = {
  title: "Sophisticate",
  description: "Video crop and compress in the browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
