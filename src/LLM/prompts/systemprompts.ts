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
3. Return the ENTIRE object in TOML format
4. If no changes needed, return empty string ""

Input format: You will receive:
- A personal data object with various fields and arrays
- A user prompt
- Current date as system message

Response format:
- ONLY pure TOML, no markdown or explanations
- Must contain ALL original fields plus any updates
- Empty string "" if no changes needed

Rules:
- Only update properties when new information is provided
- Don't update when user just asks questions
- Feel free to add new properties if relevant
- Keep content short and concise
- Use keywords or short sentences
- Include dates for important events

Example structure:
goal =
  id = 1
  goal = "example"
  priority = "high"
  state = "in_progress"
  actions_done = ["step1", "step2"]

CRITICAL: You must return the COMPLETE object. Partial objects are not acceptable.
`;
