export const GetTitlePrompt =
  'Get a short title of no more than a few words given the following user \
  query. Do not react to the query, just provide a very short summary about \
  what the user is asking for. ';

export const UpdatePersonalDataPrompt = `\
You must ALWAYS return the COMPLETE object with ALL properties, both modified and unmodified.
Never return a partial object with only the changed fields.

Instructions:
1. Analyze the input object and user prompt
2. Make necessary updates to the object
3. Return the ENTIRE object in plain text format
4. If no changes needed, return empty string ""

Input format: You will receive:
- A personal data object with various fields and arrays
- A user prompt
- Current date as system message

Response format:
- Return information in clear, natural language paragraphs
- Must contain ALL original fields plus any updates
- Empty string "" if no changes needed

Rules:
- Only update information when new details are provided
- Feel free to add new topics if relevant
- Keep only information useful for future conversations
- Include relevant dates and timeframes
- Remove outdated or irrelevant details
- Write in clear, concise paragraphs
- Group related information by topic
- Include important dates and milestones
- Focus on key points rather than full conversation logs

Example structure:

Personal Goals
John is working on quitting smoking as his highest priority goal. 
Started on December 1st, 2024. Has completed nicotine patch program 
and attended two support group meetings. Next step is to avoid 
smoking triggers.

Career Development
Currently focusing on learning Python programming. Completed basic 
course in November 2024. Working on data analysis project at work 
using pandas library. Plans to start machine learning course in January.

Hobbies & Interests
Enjoys reading mystery and thriller novels, particularly works by 
Stephen King. Goes swimming three times weekly, typically covering 
2km per session with a personal record of 4km. Maintains a small 
vegetable garden, spending about 2 hours daily on gardening activities.

Recent Activities
December 8, 2024: Prepared paella for family dinner, watched "Inception", decorated house for holidays
December 9, 2024: Regular work commute, booked summer vacation accommodations

CRITICAL: You must return the COMPLETE object with all information organized in natural language paragraphs.
`;

export const requestForMemoryPrompt = `
You will receive a user prompt and a memory object. 
The memory object contains a list of strings, and each string is a key 
to a memory containing context. The memory object may be empty. 

Instructions:
1. Analyze the user prompt and memory object.
2. Determine if the memory object contains relevant context.
3. If we need to include extra memories from the client,
    return the keys for the context that we might need.
4. If we have all the context we need, return an empty array.
5. Return valid JSON.

Don't ask for too much context, try to keep it at a minimum.
For example, when a five minute chat is requested, and there is already
some information in the context which the main agent can use to start off
the conversation, don't ask for extra information. Or maybe ask for goals_index,
if that is relevant to the conversation. Only ask for /goals/learning_guitar if
the conversation starts going towards learning guitar.

Also, if there's multiple keys in learning guitar, like learning_guitar/steps_taken, 
learning_guitar/struggles, ask for each key separately, including the full property 
name of the key.
`;

export const FetchMemoryKeysPromptForCompression = `
You are an agent tasked to find the corresponding memory keys that belong to
a plaintext document. The document is called "short-term-memory", and the keys
that it belongs to is called "long-term-memory". You are given a set of keys,
and a short term memory, and you should return a list of keys that the short
term memory should be written to. 

Example:
Long-term-memory-keys:
 - /goals/learning_guitar
 - /goals/learning_spanish
 - /friends
 - /family
 - /colleagues
 - /struggles

Short-term-memory: "The user is learning to play the guitar, he has just started out,
and he is learning to strum the chords. He is also learning to play the C major chord.

The user started learning Spanish, and he is using Duolingo to learn the language.

The user is also working on getting to bed earlier"

this ends up in a response like this:

{ keys: ["/goals/learning_guitar", "/goals/learning_spanish", "/goals/sleep_earlier"] }

Make an object containing the keys property as an array of strings.

Note /goals/sleep_earlier is a new key that should be created, as it doesn't exist yet,
this is fine if you create new keys, the follow-up prompt can fill in the details.

This way a later prompt can read and update the content of this mempory key, and 
it's context isn't bloated with irrelevant information.

Return a JSON array of strings. Only return the array, nothing else.

If no topic exists for a specific item, generate a new item, which follows
the tree structure. So goals/learning_guitar or friends/alice or friends/bob.
Don't go deeper than one level. So learning guitar should be a goal, and 
alice should be a friend. But no sub-notes for each step in learning guitar.
`;

export const MemoryCompressionPrompt = `
You are an agen who has the task of compressing short term memory into a 
key-value store for long term memory. You are given a set of keys, the
existing values for those keys in long-term memory, and the short-term memory
that should be written away. 

You will receive an object in the form of: 
{
  longTermMemory: {
    /key1: exising data for memory 1,
    /key2: value2,
    /key3: value3,
  },
  shortTermMemory: oldShortTermMemory
}

and you should return a JSON object with the same structure. The old short term
memory should be written away into the long term memory, updating the existing
data, and the new short term memory should be pruned of the information,
so it doesn't contain this information anymore. The goal is to make the short-
term memory smaller, and put information into long-term memory, grouped by topic.
Don't put them in thousands of topics, just the topics given.

You should return a JSON object with the keys
{ 
  longTermMemory: {
    key1: "A whole text document containing all the information written for this
           subject, with multiple lines and paragraphs if needed, so we can later
           fetch all this information and read it into memory, keeping it centralized
           in one location",
    key2: "Another markdown document", 
    key3: "Another markdown document"
  }, 
  shortTermMemory: newShortTermMemory, as string, not as object
}

It's no issue if you put duplicate data into different keys, make sure that we can
understand the long term memory by not having to search for related data in seemingly
unrelated keys.

Only return the values of the changed keys and the new value for short term
memory, but return the entire memory for these keys, including the old values.
`;
