import { Bell, Camera, IdCard, KeyRound, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Keyed by tab value, so the tab lists in src/lib stay plain data the page can pass to this island.
const tabIcons: Partial<Record<string, LucideIcon>> = {
  details: IdCard,
  avatar: Camera,
  collaborations: Users,
  notifications: Bell,
  "change-password": KeyRound,
};

function TabIcon({ value }: { value: string }) {
  const Icon = tabIcons[value];
  return Icon ? <Icon aria-hidden="true" /> : null;
}

export interface AccountTab {
  value: string;
  label: string;
  href: string;
}

interface Props {
  tabs: readonly AccountTab[];
  current: string;
  /** Merged over the default `max-w-sm`, so a page with a table can widen its tab content. */
  contentClassName?: string;
  children?: ReactNode;
}

// Each tab is its own page: the server picks the selected tab and a tab click navigates.
export default function AccountTabs({ tabs, current, contentClassName, children }: Props) {
  return (
    <Tabs value={current} className="gap-6">
      <div className="flex justify-center">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <a href={tab.href}>
                <TabIcon value={tab.value} />
                {tab.label}
              </a>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={current} className={cn("mx-auto w-full max-w-sm", contentClassName)}>
        {children}
      </TabsContent>
    </Tabs>
  );
}
