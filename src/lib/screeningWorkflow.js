import { supabase } from "./supabase";
export {
  SCREENING_BUCKET,
  SCREENING_STAGES,
  parseScreening,
  buildScreeningEmail,
  screeningStage,
  normalizeEmail,
} from "../../supabase/functions/_shared/screening.js";

export async function screeningAction(data, pdf) {
  let body = data;
  if (pdf) {
    body = new FormData();
    body.set("data", JSON.stringify(data));
    body.set("pdf", pdf);
  }
  const { data: result, error } = await supabase.functions.invoke(
    "screening-workflow",
    { body },
  );
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {
      /* network failure */
    }
    throw new Error(message);
  }
  if (result?.error) throw new Error(result.error);
  return result;
}
