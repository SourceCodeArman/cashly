import logging
import json
from django.conf import settings
from google import genai
from google.genai import types
from .models import Message
from apps.insights.utils import get_financial_summary_for_ai

logger = logging.getLogger(__name__)


class AIChatService:
    def __init__(self, user):
        self.user = user
        self.api_key = getattr(settings, "GEMINI_API_KEY", None)
        self.model_name = "gemini-2.0-flash"

        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                self.client = None
        else:
            self.client = None

    def process_message(self, conversation, user_message_text):
        """
        Process a user message and generate a response.
        """
        # Save user message
        Message.objects.create(
            conversation=conversation, role="user", content=user_message_text
        )

        if not self.client:
            return Message.objects.create(
                conversation=conversation,
                role="model",
                content="I'm sorry, I'm not correctly configured right now. Please check the API key.",
            )

        try:
            # 1. Gather context
            summary = get_financial_summary_for_ai(self.user)
            context_str = json.dumps(summary, indent=2, default=str)

            # 2. Build history for the prompt
            # Limitation: We might want to limit history size for token limits
            history = conversation.messages.order_by("created_at")

            # 3. Construct the prompt
            # We use a system instruction approach by prepending it
            system_instruction = f"""
You are a helpful, empathetic financial assistant named Cashly AI.
You have access to the user's financial summary:
{context_str}

Your goal is to answer questions about their finances, give advice, and help them understand their spending.
Keep answers concise (under 3 paragraphs) unless asked for details.
If you can't answer based on the data, say so.
"""

            # Add system instruction as the first part or simulated turn
            # Gemini Python SDK supports system_instruction on GenerativeModel,
            # but here we might just prepend context if using generate_content.
            # Let's use the chat session if possible, or just generate_content with history.

            # Using generate_content with a list of contents
            # We need to map role "user"/"model" to Gemini roles "user"/"model"

            # Add system prompt as a user message context?
            # Better to use the system_instruction argument if available in this SDK version.
            # Assuming google-genai SDK 0.x/1.x.
            # The previous file used `self.client.models.generate_content`.

            # Let's just create a list of messages.
            # We'll prepend the system instruction to the list or as a config.

            # Actually, let's just use a simple prompt construction for now:
            # "System: ... \n History: ... \n User: ..."
            # But `generate_content` takes `contents`.

            # Let's try to format it as a chat structure.

            # We will use a standard stateless generation for simplicity, passing history.

            final_prompt = [system_instruction]
            for msg in history:
                role = "user" if msg.role == "user" else "model"
                # For this SDK, content usually needs to be a Content object or dict.
                # Or just strings/parts.
                # Let's check `ai_advisor.py` usage: `contents=prompt` where prompt is a string.
                # So we can probably just concat or send a list of strings?
                # "Multi-turn conversations" usually require specific object structure.

                # To be safe and consistent with `ai_advisor.py`, let's just make one big text prompt
                # if we aren't sure about the SDK's chat object support in this environment.
                # BUT, chat works better with chat structure.

                # Let's try to implement a simple "append history" approach string-based
                final_prompt.append(f"{role.upper()}: {msg.content}")

            # Add the new message? No, we already saved it and it's in `history`.
            # Wait, `history` includes the message we just saved.

            full_text_prompt = "\n\n".join(final_prompt) + "\n\nMODEL:"

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_text_prompt,  # sending single string
                config=types.GenerateContentConfig(
                    temperature=0.7,  # Slightly more creative for chat
                    candidate_count=1,
                ),
            )

            response_text = response.text

            # Save model response
            return Message.objects.create(
                conversation=conversation, role="model", content=response_text
            )

        except Exception as e:
            logger.error(f"Error calling Gemini: {e}")
            return Message.objects.create(
                conversation=conversation,
                role="model",
                content="I'm having trouble connecting to my brain right now. Please try again later.",
            )
