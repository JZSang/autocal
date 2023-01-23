const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

function generatePrompt(currentDate, prompt) {
  return `
  From the following text, generate a JSON event based on the Google Calendar's events API, assuming today's date is ${currentDate}. 
  If a location is provided, add a "location" entry. 
  If there are multiple events, create an array of events.
  Under both "start" and "end" entries, set the IANA timezone based on the timezone previously provided using any viable city.
  Always assume that the text's time is based on the timezone given in today's date.
  
  "${prompt}"
  `;
}

/**
 * Returns an HTML page containing an interactive Web-based
 * tutorial. Visit the function URL to see it and learn how
 * to build with lambda.
 */
exports.handler = async (event) => {
  if (!configuration.apiKey) {
    throw new Error(
      "Code 500: OpenAI API key not configured, please follow instructions in README.md"
    );
  }

  const body = JSON.parse(event.body);

  const prompt = body.prompt || "";
  if (prompt.trim().length === 0) {
    throw new Error("Code 400: Please enter a valid prompt");
  }

  try {
    const text = generatePrompt(body.currentDate, prompt);
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: text,
      max_tokens: 500,
      temperature: 0.69,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    console.log(completion.data.choices[0].text);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({result: completion.data.choices[0].text}),
    };
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      throw new Error(`Code ${error.response.status}: ${error.response.data}`);
    } else {
      throw new Error(`Code ${error.response.status}: ${error.response.data}`);
    }
  }
};
