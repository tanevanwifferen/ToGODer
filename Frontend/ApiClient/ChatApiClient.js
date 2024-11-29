class ChatApiClient {
  static async sendMessage(
    model,
    humanPrompt,
    keepGoing,
    outsideBox,
    communicationStyle,
    messages
  ) {
    const response = await ApiClient.post('/chat', {
      model,
      humanPrompt,
      keepGoing,
      outsideBox,
      communicationStyle,
      prompts: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    });

    return {
      content: response.content,
      signature: response.signature,
    };
  }

  static async getTitle(model, messages) {
    const response = await ApiClient.post('/title', {
      model,
      content: messages.map((x) => ({
        content: x.body,
        role: x.author === 'you' ? 'user' : 'assistant',
      })),
    });

    return response.content;
  }

  static async startExperience(model, language) {
    const response = await ApiClient.post('/experience', {
      model,
      language,
    });

    return response.content;
  }
}
