import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  tab: { value: string; label: string };
  children?: ReactNode;
}

export default function AccountTabs({ tab, children }: Props) {
  return (
    <Tabs value={tab.value} className="gap-6">
      <div className="flex justify-center">
        <TabsList>
          <TabsTrigger value={tab.value}>{tab.label}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value={tab.value} className="mx-auto w-full max-w-sm">
        {children}
      </TabsContent>
    </Tabs>
  );
}
