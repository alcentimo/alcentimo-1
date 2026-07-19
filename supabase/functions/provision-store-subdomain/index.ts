import { serveStoreSubdomainProvision } from "../_shared/store-subdomain-handler.ts";

Deno.serve((request) => serveStoreSubdomainProvision(request));
