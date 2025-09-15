const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { context, knowledgeBase } = JSON.parse(event.body);
    
    // Extract relevant knowledge
    const platformGuide = knowledgeBase.guidelines[context.platform.toLowerCase()] || knowledgeBase.guidelines.web;
    const colorGroup = Object.values(knowledgeBase.iri_colors).find(group => 
      group.keywords.includes(context.keyword)
    );

    // Create prompt
    const systemPrompt = `You are a UI/UX design expert. Generate a color palette and typography guide based on the provided context.
    Platform: ${context.platform}
    Service: ${context.service}
    Mood: ${context.keyword}
    Primary Color: ${context.primaryColor}
    
    Use the following guidelines: ${JSON.stringify(platformGuide)}
    
    Return a JSON object with:
    - colorSystem: primary (main, light, dark) and secondary (main, light, dark)
    - typography: bodySize, headlineSize, lineHeight
    - accessibility: textColorOnPrimary, contrastRatio`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the design guide." }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Fallback response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        colorSystem: {
          primary: {
            main: context.primaryColor || '#6666ff',
            light: '#9999ff',
            dark: '#3333cc'
          },
          secondary: {
            main: '#ffb000',
            light: '#ffe0a0',
            dark: '#c78300'
          }
        },
        typography: {
          bodySize: '17pt',
          headlineSize: '34pt',
          lineHeight: '1.6'
        },
        accessibility: {
          textColorOnPrimary: '#ffffff',
          contrastRatio: '12.36:1'
        }
      })
    };
  }
};