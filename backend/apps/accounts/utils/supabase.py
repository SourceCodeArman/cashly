import logging
from django.conf import settings
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

logger = logging.getLogger(__name__)


class SupabaseUtil:
    _client: Client = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._client is None:
            url = settings.SUPABASE_URL
            key = settings.SUPABASE_SECRET_KEY
            if not url or not key:
                logger.error("Supabase URL or Key not configured")
                return None

            # Initialize with options if needed, defaults are usually fine
            cls._client = create_client(url, key)
        return cls._client

    @classmethod
    def get_user_from_token(cls, token: str):
        """
        Verifies the Supabase JWT and returns the user object from Supabase Auth.
        """
        client = cls.get_client()
        if not client:
            return None

        try:
            # Verify the session/token
            # The Admin client can get user data by token
            user = client.auth.get_user(token)
            return user
        except Exception as e:
            logger.error(f"Failed to verify Supabase token: {e}")
            return None
