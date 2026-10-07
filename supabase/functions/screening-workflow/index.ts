import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createScreeningHandler } from "./handler.ts";

Deno.serve(createScreeningHandler());
