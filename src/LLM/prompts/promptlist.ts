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
  PersonalGrowthPrompt,
  fiveMinuteCheckin,
  fifteenMinuteCheckin,
  ConnectionFacilitatorPrompt,
  RecursionPrompt,
} from './chatprompts';
import { ExperiencePrompt } from './experienceprompts';

interface PromptListItem {
  prompt: string;
  description: string;
  display: boolean;
  aliases?: string[];
}

export const PromptList: Record<string, PromptListItem> = {
  '/experience': {
    prompt: ExperiencePrompt,
    description: 'Let us lead the conversation.',
    display: false,
  },
  '/default': {
    prompt: NoSteeringPrompt,
    description:
      'Leave the ai to decide for itself. There is no steering in what \
    to interpret and find conclusions out of. Leaves most of the \
    concluding work to you.',
    display: true,
  },
  /*
  '/fiveMinuteCheckin': {
    prompt: fiveMinuteCheckin,
    description: 'A quick check-in to see how you are doing.',
    display: true,
  },
  '/fifteenMinuteCheckin': {
    prompt: fifteenMinuteCheckin,
    description: 'A longer check-in to see how you are doing.',
    display: true,
  },
  '/thirtyMinuteCheckin': {
    prompt: fifteenMinuteCheckin,
    description: "A deep dive into how you're doing.",
    display: true,
  },
  '/recursion': {
    prompt: RecursionPrompt,
    description: 'A recursive prompt. Beware.',
    display: true,
  },
  '/growth': {
    prompt: PersonalGrowthPrompt,
    description:
      'A space for personal evolution and deeper explorations. \
      Where growth meets gnosis.',
    display: true,
  },
  '/scientific': {
    prompt: ScientificPrompt,
    description:
      'Look at a problem from a scientific perspective. Gives better results \
      but does not look at the spiritual side of things.',
    display: false,
  },
  '/spiritual': {
    prompt: SpiritualPrompt,
    description:
      'Look at a problem from a spiritual perspective. Helps find \
    peace in a distorted world.',
    display: false,
  },
  '/yinyang': {
    prompt: YinYangPrompt,
    description:
      'Take a dualistic approach for a problem. Easier to interpret \
      than AllSides, but not as easy as spiritual or scientific. For \
      more advanced users who have taught themselves to see two sides \
      of a coin.',
    display: false,
    aliases: ['/scientificspiritual'],
  },
  '/allsides': {
    prompt: AllSidesPrompt,
    description:
      'Look at all sides of an issue. Most difficult to interpret and find \
      conclusions out of. Leaves most of the concluding work to you.',
    display: false,
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
    description: 'The AI takes on a medium persona.',
    display: true,
  },
  '/connection': {
    prompt: ConnectionFacilitatorPrompt,
    description:
      'Helps two or more people deepen their connection with each other. \
      Creates a safe space for vulnerability, empathy, and authentic sharing. \
      Perfect for couples, friends, family members, or anyone wanting to \
      understand each other better.',
    display: true,
    aliases: ['/connect', '/bonding'],
  },*/
};
