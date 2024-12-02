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
  It is accompanied with a propmt that the user has sent, and it is your job to \
  see if this json object with personal data needs to be updated. If it does, \
  I want you to send the data in a very specific data format: it should be a JSON object, \
  but instead of the name, you should return "setName". If you want to add a field which \
  you believe is important, you add "add{FieldName}" and if an array value should be updated,\
  you should return \
  "update{FieldName}":[{id: 1, goal: understand togoder, priority: low, state: in_progress, actions_done: [installed app, had a conversation]}]. \
  If you want to remove a field, e.g. if it is completed, or if someone isn\'t a friend anymore, you should return removeGoal: [{id: 1}]\
  \
  Return valid JSON, ONLY send the JSON object, no markdown things, and let me parse the object in the client side.\
  \
  ONLY return data you want to modify, ignore the rest.\
  \
  Only update a property when new information is provided.\
  Don\'t update a property when the user asks a question, return an empty object then {}\
  \
  \
  If the input object contains anything weird, unreadable, feel free to replace it with something more readable.\
  You are the boss here, so you should be able to parse it. If there\'s some weird arrays or items in there, \
  feel free to delete the items. But parsing and restructuring would be much better.\
';
