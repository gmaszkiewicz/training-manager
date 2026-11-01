import React, { useRef, useState } from "react";
import { Save } from "lucide-react";
import { FormErrorToasts, useFormErrors } from "@/components/auth/FormErrorToasts";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { submitAuthForm } from "@/lib/auth-form";
import {
  COMPONENTS_UNAVAILABLE_ERROR,
  componentFieldName,
  MODULE_NOT_BUILT_NOTE,
  moduleFieldName,
  OFF_OPTION_LABEL,
  versionOptionLabel,
} from "@/lib/component-settings-form";
import { COMPONENT_OFF, componentModules, componentsForRole } from "@/lib/components";
import type { ComponentId, ComponentSettings, ModuleId, Profile } from "@/types";

interface Props {
  settings: ComponentSettings;
  role: Profile["role"] | null;
  serverError?: string | null;
  notice?: string | null;
  unavailable?: boolean;
}

export default function ComponentsForm({ settings, role, serverError, notice, unavailable }: Props) {
  const [modules, setModules] = useState<Record<ModuleId, boolean>>(settings.modules);
  const [components, setComponents] = useState<Record<ComponentId, string>>(settings.components);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const { items, dismiss, reportServerError } = useFormErrors<never>(serverError, undefined, notice);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable || savingRef.current) {
      return;
    }
    const form = event.currentTarget;
    savingRef.current = true;
    setSaving(true);
    void submitAuthForm(form, COMPONENTS_UNAVAILABLE_ERROR).then((result) => {
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      savingRef.current = false;
      setSaving(false);
      reportServerError(result.error);
    });
  }

  return (
    <form method="POST" action="/api/settings/components" className="space-y-6" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={unavailable} className="space-y-6">
        {componentModules.map((module) => {
          const switchId = `module-${module.id}`;
          const moduleOn = module.built && modules[module.id];
          const rows = module.built && role ? componentsForRole(module.id, role) : [];
          return (
            <section key={module.id} aria-labelledby={`${switchId}-label`} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={`${switchId}-label`} className="text-base font-semibold">
                    {module.label}
                  </h2>
                  {module.built ? null : <p className="text-muted-foreground text-sm">{MODULE_NOT_BUILT_NOTE}</p>}
                </div>
                <Switch
                  id={switchId}
                  aria-labelledby={`${switchId}-label`}
                  aria-controls={rows.length > 0 ? `${switchId}-components` : undefined}
                  aria-expanded={rows.length > 0 ? moduleOn : undefined}
                  checked={moduleOn}
                  disabled={!module.built}
                  onCheckedChange={(checked) => {
                    setModules((current) => ({ ...current, [module.id]: checked }));
                  }}
                />
                {module.built ? (
                  <input type="hidden" name={moduleFieldName(module.id)} value={moduleOn ? "on" : "off"} />
                ) : null}
              </div>

              {/* A switched-off module collapses its list; it stays mounted so its hidden fields keep the choices. */}
              {rows.length > 0 ? (
                <div id={`${switchId}-components`} hidden={!moduleOn}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Version</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((component) => {
                        const selectId = `component-${component.id}`;
                        return (
                          <TableRow key={component.id}>
                            <TableCell>
                              <label htmlFor={selectId}>{component.label}</label>
                            </TableCell>
                            <TableCell className="text-right">
                              <Select
                                value={components[component.id]}
                                disabled={!moduleOn}
                                onValueChange={(value) => {
                                  setComponents((current) => ({ ...current, [component.id]: value }));
                                }}
                              >
                                <SelectTrigger id={selectId} className="ml-auto w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={COMPONENT_OFF}>{OFF_OPTION_LABEL}</SelectItem>
                                  {component.versions.map((version) => (
                                    <SelectItem key={version.id} value={version.id}>
                                      {versionOptionLabel(version)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* A disabled control is not submitted, so the choice always travels in a hidden field. */}
                              <input
                                type="hidden"
                                name={componentFieldName(component.id)}
                                value={components[component.id]}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </section>
          );
        })}
      </fieldset>

      <FormErrorToasts items={items} onDismiss={dismiss} />

      <fieldset disabled={unavailable}>
        <SubmitButton pendingText="Saving components..." icon={<Save className="size-4" />} forcePending={saving}>
          Save
        </SubmitButton>
      </fieldset>
    </form>
  );
}
