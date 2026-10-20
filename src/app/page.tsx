import { formatNaira, kobo } from "@/lib/money";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">PayDesk Admin</h1>
      <p className="max-w-md text-foreground/70">
        An open-source operations console for a fictional payments platform.
        Under active development.
      </p>
      <p className="font-mono text-sm text-foreground/50">
        {formatNaira(kobo(123_456_789))} processed in your imagination so far
      </p>
    </main>
  );
}
