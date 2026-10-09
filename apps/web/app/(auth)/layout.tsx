import { LanguageSwitch } from "@/components/i18n/Translator";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <LanguageSwitch floating />
    </>
  );
}
