// netlify/functions/groq.js
// This is your secure backend — API key never exposed to users

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get ingredients from the request
    const { ingredients } = JSON.parse(event.body);
    
    if (!ingredients) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No ingredients provided' })
      };
    }

    // Your API key is stored in Netlify environment variables
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // The prompt for Groq
    const prompt = `You are VITA AI, a forensic food safety expert. Analyze these ingredients.

Ingredients: ${ingredients}

Use your knowledge of EFSA, FDA, WHO, and peer-reviewed research.

For each harmful ingredient, provide:
- name
- why it's harmful
- status in EU, USA, India
- source citation

Return ONLY valid JSON:
{
  "harmful_ingredients": [
    {"name": "...", "reason": "...", "eu_status": "...", "us_status": "...", "india_status": "...", "source": "..."}
  ],
  "safe_ingredients": ["..."],
  "tier": "RED/YELLOW/GREEN",
  "score": 0,
  "summary": "..."
}`;

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
