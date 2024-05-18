import {
  IndividuationPrompt,
  SocialPrompt,
  TherapistPrompt,
} from "./systemprompts";

export const PromptList: Record<string, string> = {
  "/individuation": IndividuationPrompt,
  "/sociallife": SocialPrompt,
  "/therapist": TherapistPrompt,
};
