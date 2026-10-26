import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface AccountTab {
  value: string;
  label: string;
  href: string;
}

interface Props {
  tabs: readonly AccountTab[];
  current: string;
  children?: ReactNode;
}

// Each tab is its own page: the server picks the selected tab and a tab click navigates.
export default function AccountTabs({ tabs, current, children }: Props) {
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
      <TabsContent value={current} className="mx-auto w-full max-w-sm">
        {children}
      </TabsContent>
    </Tabs>
  );
}
