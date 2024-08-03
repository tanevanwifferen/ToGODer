import {
  AllSidesPrompt,
  IndividuationPrompt,
  PracticalPrompt,
  ScientificPrompt,
  YinYangPrompt,
  SocialPrompt,
  SpiritualPrompt,
  CouncellorPrompt as ArbitrationPrompt,
  NoSteeringPrompt,
  DeescalationPrompt,
  SocialConversationPrompt,
  PhilosophicalGuidancePrompt,
} from './chatprompts';
import { ExperiencePrompt } from './experienceprompts';

interface PromptListItem {
  prompt: string;
  description: string;
  display: boolean;
  aliases?: string[];
}

export const PromptList: Record<string, PromptListItem> = {
  '/default': {
    prompt: NoSteeringPrompt,
    description:
      'Leave the ai to decide for itself. There is no steering in what \
    to interpret and find conclusions out of. Leaves most of the \
    concluding work to you.',
    display: true,
  },
  '/scientific': {
    prompt: ScientificPrompt,
    description:
      'Look at a problem from a scientific perspective. Gives better results \
      but does not look at the spiritual side of things.',
    display: true,
  },
  '/spiritual': {
    prompt: SpiritualPrompt,
    description:
      'Look at a problem from a spiritual perspective. Helps find \
    peace in a distorted world.',
    display: true,
  },
  '/yinyang': {
    prompt: YinYangPrompt,
    description:
      'Take a dualistic approach for a problem. Easier to interpret \
      than AllSides, but not as easy as spiritual or scientific. For \
      more advanced users who have taught themselves to see two sides \
      of a coin.',
    display: true,
    aliases: ['/scientificspiritual'],
  },
  '/allsides': {
    prompt: AllSidesPrompt,
    description:
      'Look at all sides of an issue. Most difficult to interpret and find \
      conclusions out of. Leaves most of the concluding work to you.',
    display: true,
  },
  '/individuation': {
    prompt: IndividuationPrompt,
    description:
      'Asks questions about what you believe is best. \
    Teaches you to find yourself and help yourself. Based on the \
    work by Carl Jung.',
    display: true,
  },
  '/sociallife': {
    prompt: SocialPrompt,
    description:
      "\
  Helps with your social life if you're looking for it. Helps you \
  discover hobbies, excersize, social activities that get you more\
  connected or get to know new people.",
    display: true,
  },
  '/arbitration': {
    prompt: ArbitrationPrompt,
    description:
      '\
  An intermediary when conflicts arise with those close to you. \
  Tries to get to know a situation and then tries to find a \
  solution where both sides are happy.',
    display: true,
  },
  '/deescalation': {
    prompt: DeescalationPrompt,
    description:
      "Helps deescalate ramapant emotional thoughts, \
    and helps put a situation into perspective when you can't \
    see the forest for the trees anymore.",
    display: true,
  },
  '/practical': {
    prompt: PracticalPrompt,
    description: 'Helps with practical problems.',
    display: true,
  },
  '/SocialConversation': {
    prompt: SocialConversationPrompt,
    description:
      'Have a social conversation. Talk to a friend, and not a therapist here.',
    display: true,
  },
  '/medium': {
    prompt: PhilosophicalGuidancePrompt,
    description: 'Classical medium conversation',
    display: true,
  },
  '/experience': {
    prompt: ExperiencePrompt,
    description: 'Let us lead the conversation.',
    display: false,
  },
};
