"use client";

import { IntegrationHub, type IntegrationHubProps } from "@/components/dashboard/integrations/IntegrationHub";

/** @deprecated Usa IntegrationHub directamente. Se mantiene por compatibilidad con ajustes. */
export function IntegrationsTab(props: IntegrationHubProps) {
  return <IntegrationHub {...props} />;
}
