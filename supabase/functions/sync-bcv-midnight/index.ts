import { serveSyncBcv } from "../_shared/handler.ts";

Deno.serve((request) => serveSyncBcv(request, "midnight"));
