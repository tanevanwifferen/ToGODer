export const GetTitlePrompt =
  'Get a short title of no more than a few words given the following user \
  query. Do not react to the query, just provide a very short summary about \
  what the user is asking for. ';

export const UpdatePersonalDataPrompt = `\
You must ALWAYS return the COMPLETE object with ALL properties. Never return partial objects.

Input Details:
- Personal data object with fields and arrays
- User prompt for updates
- Current date as system message

Response Requirements:
- Return ALL information in clear, natural language paragraphs
- Include both modified and unmodified fields
- Return empty string "" if no changes needed

Guidelines:
- Update information only when new details are provided
- Add new topics when relevant to user's life
- Maintain chronological order for time-sensitive information
- Include specific dates and timeframes
- Remove outdated or irrelevant information
- Group related information by topic
- Focus on key details rather than conversation logs

Example Structure:

Personal Goals
John is working on quitting smoking (highest priority). Started December 1st, 2024. 
Completed nicotine patch program and attended two support group meetings. 
Next step: avoiding smoking triggers.

Career Development
Learning Python programming - completed basic course (November 2024). 
Current: Data analysis project using pandas library.
Planned: Machine learning course in January.

Hobbies & Interests
Reading: Mystery/thriller novels (Stephen King)
Exercise: Swimming 3x weekly, 2km sessions, PR: 4km
Gardening: Daily maintenance (2 hours)

Recent Activities
Dec 8, 2024: Family dinner, "Inception" movie, holiday decorating
Dec 9, 2024: Work commute, vacation planning

CRITICAL: Return the COMPLETE object with all information organized in clear paragraphs.
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

Example: 
User prompt: "Can you tell me about my goals?"
Memory object: ["/goals/learning_guitar", "/goals/learning_spanish", "/goals/sleep_earlier"]

You will return:
{keys: ["/goals/learning_guitar", "/goals/learning_spanish", "/goals/sleep_earlier"]}

Don't ask for too much context, try to keep it at a minimum.
For example, when a five minute chat is requested, and there is already
some information in the context which the main agent can use to start off
the conversation, don't ask for extra information. Or maybe ask for goals_index,
if that is relevant to the conversation. Only ask for /goals/learning_guitar if
the conversation starts going towards learning guitar.

If you don't want to ask for any context, return this:

{keys: []}

Also, if there's multiple keys in learning guitar, like learning_guitar/steps_taken, 
learning_guitar/struggles, ask for each key separately, including the full property 
name of the key.

ONLY RETURN A RESPONSE IN THE FORM OF {keys: string[]}, NO FILLER TEXT, NO OTHER STUFF, PURE JSON
`;

export const FetchMemoryKeysPromptForCompression = `
You are tasked with analyzing short-term memory content and identifying relevant long-term memory keys where this information should be stored. Your goal is to categorize information by subject matter into broad, logical topics without over-fragmenting the data.

Instructions:
1. Analyze the provided short-term memory content
2. Match content to existing memory keys where appropriate
3. Suggest new keys only for major, distinct topics
4. Group related information under common subject categories
5. Return a valid JSON object with selected keys

Key Creation Guidelines:
- Use subject-based categories (e.g., /goals, /relationships, /work)
- Avoid using dates or timestamps in keys
- Organize by topic and subtopic (e.g., /work/projects, /health/exercise)
- Keep total number of keys minimal by grouping related topics
- Only create new keys for significant, distinct subjects

Example Input:
Short-term memory: "User discussed career goals in tech, wanting to learn Python 
and AWS. Also mentioned meeting friend Alice for coffee and having dinner with 
Bob. Currently reading 'Clean Code' and practicing meditation."

Example Output:
{
  "keys": [
    "/career/tech_goals",
    "/relationships/social",
    "/skills/programming",
    "/lifestyle/wellness"
  ]
}

Note: Return ONLY a valid JSON object containing a single 'keys' array. Do not 
include any explanation or additional text in your response.
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
