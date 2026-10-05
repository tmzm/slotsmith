import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "slotsmith/data-table.css";
import { Providers } from "./providers";

export const metadata = { title: "slotsmith with Next.js" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The language lives in a cookie, so the server renders the right lang and dir from the first byte.
  const language = (await cookies()).get("lang")?.value === "ar" ? "ar" : "en";
  return (
    <html lang={language} dir={language === "ar" ? "rtl" : "ltr"}>
      <body>
        <Providers initialLanguage={language}>{children}</Providers>
      </body>
    </html>
  );
}
