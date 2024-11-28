let authStore = null;

function initializeApi(store) {
  authStore = store;
}

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authStore?.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`;
  }
  return headers;
}

async function handleRateLimit(response) {
  const retryAfter = response.headers.get('Retry-After');
  const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // default to 1 minute
  throw {
    type: 'RateLimit',
    waitTime,
    minutes: Math.floor(waitTime / 60000),
    seconds: Math.floor((waitTime % 60000) / 1000),
  };
}

async function handleResponse(response) {
  if (response.status === 429) {
    return await handleRateLimit(response);
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return await response.json();
}

async function sendMessage(
  model,
  humanPrompt,
  keepGoing,
  outsideBox,
  communicationStyle,
  messages
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      humanPrompt,
      keepGoing,
      outsideBox,
      communicationStyle,
      prompts: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    }),
  });

  const data = await handleResponse(response);
  return {
    content: data.content,
    signature: data.signature,
  };
}

async function getTitle(model, messages) {
  const response = await fetch('/api/title', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      content: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    }),
  });

  const data = await handleResponse(response);
  return data.content;
}

async function startExperience(model, language) {
  const response = await fetch('/api/experience', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      language,
    }),
  });

  const data = await handleResponse(response);
  return data.content;
}
