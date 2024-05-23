import {
  AllSidesPrompt,
  IndividuationPrompt,
  PracticalPrompt,
  ScientificPrompt,
  ScientificSpiritualPrompt,
  SocialPrompt,
  SpiritualPrompt,
  TherapistPrompt,
} from "./systemprompts";

export const PromptList: Record<string, string> = {
  "/default": AllSidesPrompt,
  "/scientific": ScientificPrompt,
  "/spiritual": SpiritualPrompt,
  "/scientificspiritual": ScientificSpiritualPrompt,
  "/individuation": IndividuationPrompt,
  "/sociallife": SocialPrompt,
  "/therapist": TherapistPrompt,
  "/practical": PracticalPrompt,
};
