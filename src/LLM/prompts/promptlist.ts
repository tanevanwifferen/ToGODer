import {
  AllSidesPrompt,
  IndividuationPrompt,
  PracticalPrompt,
  ScientificPrompt,
  ScientificSpiritualPrompt,
  SocialPrompt,
  SpiritualPrompt,
  CouncellorPrompt as ArbitrationPrompt,
  NoSteeringPrompt,
} from "./chatprompts";

interface PromptListItem {
  prompt: string;
  description: string;
}

export const PromptList: Record<string, PromptListItem> = {
  "/default": {
    prompt: NoSteeringPrompt,
    description:
      "Leave the ai to decide for itself. There is no steering in what \
    to interpret and find conclusions out of. Leaves most of the \
    concluding work to you.",
  },
  "/scientific": {
    prompt: ScientificPrompt,
    description:
      "Look at a problem from a scientific perspective. Gives better results \
      but does not look at the spiritual side of things.",
  },
  "/spiritual": {
    prompt: SpiritualPrompt,
    description:
      "Look at a problem from a spiritual perspective. Helps find \
    peace in a distorted world.",
  },
  "/scientificspiritual": {
    prompt: ScientificSpiritualPrompt,
    description:
      "Look at both spiritual and scientific arguments for a \
    problem. Better than AllSides, but not as good as spiritual or \
    scientific. For more advanced users who have taught themselves to \
    see two sides of a coin.",
  },
  "/allsides": {
    prompt: AllSidesPrompt,
    description:
      "Look at all sides of an issue. Most difficult to interpret and find \
      conclusions out of. Leaves most of the concluding work to you.",
  },
  "/individuation": {
    prompt: IndividuationPrompt,
    description:
      "Asks questions about what you believe is best. \
    Teaches you to find yourself and help yourself. Based on the \
    work by Carl Jung.",
  },
  "/sociallife": {
    prompt: SocialPrompt,
    description:
      "\
  Helps with your social life if you're looking for it. Helps you \
  discover hobbies, excersize, social activities that get you more\
  connected or get to know new people.",
  },
  "/arbitration": {
    prompt: ArbitrationPrompt,
    description:
      "\
  An intermediary when conflicts arise with those close to you. \
  Tries to get to know a situation and then tries to find a \
  solution where both sides are happy.",
  },
  "/practical": {
    prompt: PracticalPrompt,
    description: "Helps with practical problems.",
  },
};
