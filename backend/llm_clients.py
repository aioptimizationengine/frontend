import os
import openai
try:
    import anthropic
except ImportError:
    anthropic = None

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# OpenAI LLM call - FIXED for current API
async def call_openai(prompt, model="gpt-3.5-turbo", max_tokens=256):
    if not OPENAI_API_KEY :
        raise ValueError("Valid OPENAI_API_KEY not set")
    
    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"OpenAI API error: {e}")

# Anthropic/Claude LLM call - FIXED to raise errors instead of returning mock responses
async def call_anthropic(prompt, model="claude-3-opus-20240229", max_tokens=256):
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == 'test_key' or not anthropic:
        raise ValueError("Valid ANTHROPIC_API_KEY not set or anthropic library not available")
    
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        raise Exception(f"Anthropic API error: {e}")