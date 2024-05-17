import { IndividuationPrompt, TherapistPrompt } from "./systemprompts";

export const PromptList: Record<string, string> = {
  "/individuation": IndividuationPrompt,
  "/therapist": TherapistPrompt,
};
