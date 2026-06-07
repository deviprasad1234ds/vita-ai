// netlify/functions/groq.js
// Secure backend for Truth2Eat Scanner — API key never exposed to users

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get ingredients and user profile from the request
    const { ingredients, userProfile } = JSON.parse(event.body);
    
    if (!ingredients) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No ingredients provided' })
      };
    }

    // Your API key is stored in Netlify environment variables (never in code)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Build prompt with user profile
    const profile = userProfile || { pregnant: false, infant: false, senior: false, pet: false };
    
    const prompt = `You are Truth2Eat Scanner, a forensic food safety expert. Analyze these ingredients.

User Profile:
- Pregnant: ${profile.pregnant}
- Infant under 3 in home: ${profile.infant}
- Senior 65+: ${profile.senior}
- Pet owner: ${profile.pet}

Ingredients: ${ingredients}

RULES:
- If Titanium Dioxide (E171) present → RED TIER, 92%, [PDF 10] EFSA 2021
- If Red 40, Yellow 5, Yellow 6 present → YELLOW TIER, 82%, [PDF 1] Nigg 2012
- If BPA or Phthalates present → RED TIER, 91%, [PDF 3] Endocrine Society
- If none → GREEN TIER, 95%, [Truth2Eat Protocol]

Return ONLY valid JSON:
{
  "tier": "RED/YELLOW/GREEN",
  "confidence": "XX%",
  "source": "[PDF X]",
  "rationale": "Brief scientific reason",
  "display_text": "Short, actionable warning for the user"
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
