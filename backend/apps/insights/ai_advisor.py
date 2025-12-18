"""
AI Financial Advisor Service.
Handles generation of AI-powered financial recommendations.
"""

import logging
import json
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class AIFinancialAdvisor:
    """
    Service for generating financial advice using Gemini.
    """

    def __init__(self):
        self.api_key = getattr(settings, "GEMINI_API_KEY", None)
        self.model_name = "gemini-2.0-flash"

        if not self.api_key:
            logger.warning(
                "Gemini API key not configured. AI recommendations will be disabled."
            )
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self.client = None

    def generate_advice(self, financial_summary):
        """
        Generate financial advice based on the provided summary.

        Args:
            financial_summary (dict): context about user's finances

        Returns:
            list: List of recommendation dicts with title, description, priority
        """
        if not self.client:
            return []

        try:
            prompt = self._build_prompt(financial_summary)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    candidate_count=1,
                    response_mime_type="application/json",
                ),
            )

            return self._parse_response(response.text)

        except Exception as e:
            logger.error(f"Error generating financial advice: {e}")
            return []

    def _build_prompt(self, summary):
        """Construct the prompt for the AI."""
        # Convert summary to a readable string representation
        context_str = json.dumps(summary, indent=2, default=str)

        return f"""
You are an expert personal financial advisor. Analyze the following financial summary for a user and provide 1-3 actionable, specific recommendations to improve their financial health.

Financial Context:
{context_str}

Guidelines:
1. Focus on high-impact areas (e.g., high spending in non-essential categories, lack of savings, subscription overload).
2. Be encouraging but direct.
3. Keep titles short and punchy.
4. Keep descriptions under 2 sentences.
5. Assign a priority (high/medium/low) based on urgency.

Response Format (JSON Array):
[
    {{
        "title": "Actionable Title",
        "description": "Clear explanation of what to do and why.",
        "priority": "high|medium|low",
        "type": "savings|budget|general"
    }}
]
"""

    def _parse_response(self, response_text):
        """Parse the JSON response."""
        try:
            # Clean up potential markdown blocks
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]

            data = json.loads(text)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "recommendations" in data:
                return data["recommendations"]
            else:
                return []

        except json.JSONDecodeError:
            logger.error("Failed to parse AI advice response")
            return []
