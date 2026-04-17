import RouterSetupWizard from "@/components/router-setup-wizard";
import { requireUserSession } from "@/lib/session";

export default async function NewRouterPage() {
  await requireUserSession();

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(21,127,107,0.16),_transparent_42%)]">
      <RouterSetupWizard />
    </main>
  );
}
