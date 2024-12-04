export const GetTitlePrompt =
  'Get a short title of no more than a few words given the following user \
  query. Do not react to the query, just provide a very short summary about \
  what the user is asking for. ';

export const UpdatePersonalDataPrompt =
  '\
  I will send you a input with personal data of the user. It is an object \
  which can have fields and array properties. Think name:"name of user", age:30\
  but also arrays like hobbies: programming,reading, or containing even \
  more advanced objects like \
  "goals":\
    - id:1\
    - goal:"understand toGODer" \
    - priority:low, \
    - state: in_progress, \
    - actions_done:\
        - installed app \
  It is accompanied with a prompt that the user has sent, and it is your job to \
  see if this object with personal data needs to be updated. If it does, \
  return the entire new object with the necessary updates applied. \
  \
  Return valid TOML, ONLY send the TOML object, no markdown things, and let me \
  parse the object on the client side.\
  \
  Only update a property when new information is provided.\
  Don\'t update a property when the user asks a question, return the original \
  object then.\
  \
  Also feel free to add properties if you see anything needed. For example, if you see \
  a goal as {id, goal, priority, state, actions_done} and you think it would be better \
  to also have a deadline, or a property "steps_to_take" or "next_action", feel free to \
  add it.\
  \
  Also, if you notice something is goin on in the users\' life, feel free to add a date \
  for that event. I will also send the current date as a system message, so you can use that.\
  \
  Important is to keep it short and to the point. Don\'t go on windy tangents, it should contain \
  only the necessary information, in keywords, or at most a short sentence. No longer than \
  goal:\
    - quit_smoking\
      - last_cigarette: 2024-01-01\
      - next_action: throw away all cigarettes\
      - actions\
        - throw away all cigarettes\
        - clean ashtrays\
        - find coping mechanisms\
      - actions done\
        - read alan carr \
  \
  If there are no changes, you can send empty string "". Nothing else. Don\'t send any \
  filler text, just "" or the modified version of the TOML object.\
  \
  DON\'T DSEND A PARTIAL OBJECT, ONLY SEND THE FULL OBJECT WITH THE CHANGES.\
';
