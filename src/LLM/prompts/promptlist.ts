import {
  AllSidesPrompt,
  IndividuationPrompt,
  PracticalPrompt,
  ScientificPrompt,
  ScientificSpiritualPrompt,
  SocialPrompt,
  SpiritualPrompt,
  CouncellorPrompt as ArbitrationPrompt,
} from "./systemprompts";

export const PromptList: Record<string, string> = {
  "/default": AllSidesPrompt,
  "/scientific": ScientificPrompt,
  "/spiritual": SpiritualPrompt,
  "/scientificspiritual": ScientificSpiritualPrompt,
  "/individuation": IndividuationPrompt,
  "/sociallife": SocialPrompt,
  "/arbitration": ArbitrationPrompt,
  "/practical": PracticalPrompt,
};
