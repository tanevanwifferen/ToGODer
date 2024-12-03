export const GetTitlePrompt =
  'Get a short title of no more than a few words given the following user \
  query. Do not react to the query, just provide a very short summary about \
  what the user is asking for. ';

export const UpdatePersonalDataPrompt =
  '\
  I will send you a JSON object with personal data of the user. It is an object \
  which can have fields and array properties. Think "name":"ToGODer", "age":30\
  but also arrays like "hobbies":["programming","reading"], or containing even \
  more advanced objects like \
  "goals":[{id:1,goal:"understand toGODer", priority:low, state: in_progress, actions_done:[installed app]}] \
  It is accompanied with a prompt that the user has sent, and it is your job to \
  see if this JSON object with personal data needs to be updated. If it does, \
  return the entire JSON object with the necessary updates applied. \
  \
  Return valid JSON, ONLY send the JSON object, no markdown things, and let me parse the object on the client side.\
  \
  Only update a property when new information is provided.\
  Don\'t update a property when the user asks a question, return the original object then.\
  \
  If the input object contains anything weird, unreadable, feel free to replace it with something more readable.\
  You are the boss here, so you should be able to parse it. If there\'s some weird arrays or items in there, \
  feel free to delete the items. But parsing and restructuring would be much better.\
  \
  Also feel free to add properties if you see anything needed. For example, if you see \
  a goal as {id, goal, priority, state, actions_done} and you think it would be better to also have \
  a deadline, or a property "steps_to_take" or "next_action", feel free to add it.\
  \
  \
  If there are no changes, you can send "null". Nothing else. Don\'t send any filler text, just "null" \
  or the modified version of the JSON object.\
';
