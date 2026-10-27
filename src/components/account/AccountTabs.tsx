import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
              <a href={tab.href}>{tab.label}</a>
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
