"""
Plaid webhook handling.
"""
import base64
import hashlib
import hmac
import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Account, PlaidWebhookEvent
from .tasks import (
    process_item_error_webhook,
    process_item_login_required,
    process_transactions_webhook,
    sync_account_balances,
)

logger = logging.getLogger(__name__)


class PlaidWebhookThrottle(AnonRateThrottle):
    scope = 'plaid_webhook'
    rate = getattr(settings, 'PLAID_WEBHOOK_RATE', '120/minute')


class PlaidWebhookView(APIView):
    """
    Handle Plaid webhook callbacks.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PlaidWebhookThrottle]

    def _verify_signature(self, request):
        secret = getattr(settings, 'PLAID_WEBHOOK_SECRET', '')
        if not secret:
            return True  # Signature checks disabled

        provided_signature = request.headers.get('Plaid-Verification')
        if not provided_signature:
            logger.warning('Missing Plaid-Verification header on webhook request')
            return False

        computed = base64.b64encode(
            hmac.new(secret.encode(), request.body, hashlib.sha256).digest()
        ).decode()
        return hmac.compare_digest(provided_signature, computed)

    def _verify_ip(self, request):
        allowed_ips = getattr(settings, 'PLAID_WEBHOOK_ALLOWED_IPS', [])
        if not allowed_ips:
            return True
        remote_addr = request.META.get('REMOTE_ADDR')
        return remote_addr in allowed_ips
    
    def _enforce_idempotency(self, request):
        ttl = getattr(settings, 'PLAID_WEBHOOK_IDEMPOTENCY_TTL', 300)
        if not ttl:
            return True
        fingerprint = hashlib.sha256(request.body).hexdigest()
        cache_key = f'plaid:webhook:{fingerprint}'
        if cache.get(cache_key):
            logger.info('Duplicate Plaid webhook detected, ignoring event')
            return False
        cache.set(cache_key, True, ttl)
        return True

    def post(self, request, *args, **kwargs):
        if not self._verify_ip(request):
            logger.warning('Rejected Plaid webhook from unauthorized IP %s', request.META.get('REMOTE_ADDR'))
            return Response({'status': 'error', 'message': 'Unauthorized source'}, status=status.HTTP_403_FORBIDDEN)

        if not self._verify_signature(request):
            logger.warning('Rejected Plaid webhook due to invalid signature')
            return Response({'status': 'error', 'message': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data or {}
        webhook_type = payload.get('webhook_type')
        webhook_code = payload.get('webhook_code')
        item_id = payload.get('item_id')
        account_ids = payload.get('account_ids')
        error = payload.get('error', {})

        if not item_id:
            logger.warning('Received Plaid webhook without item_id: %s', payload)
            return Response(
                {'status': 'error', 'message': 'Missing item_id in webhook payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            'Received Plaid webhook type=%s code=%s item=%s',
            webhook_type,
            webhook_code,
            item_id,
        )

        if not self._enforce_idempotency(request):
            return Response({'status': 'duplicate'}, status=status.HTTP_200_OK)

        PlaidWebhookEvent.objects.create(
            item_id=item_id,
            webhook_type=webhook_type or 'UNKNOWN',
            webhook_code=webhook_code or 'UNKNOWN',
            payload=payload,
        )

        # Ensure we know about the item
        if not Account.objects.filter(plaid_item_id=item_id).exists():
            logger.warning('Ignoring webhook for unknown Plaid item %s', item_id)
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

        if webhook_type == 'TRANSACTIONS':
            process_transactions_webhook.delay(item_id, account_ids)
        elif webhook_type == 'AUTH':
            sync_account_balances.delay(item_id)
        elif webhook_type == 'ITEM' and webhook_code == 'ERROR':
            process_item_error_webhook.delay(
                item_id,
                error.get('error_code'),
                error.get('error_message'),
            )
        elif webhook_type == 'ITEM' and webhook_code in {'PENDING_EXPIRATION', 'USER_PERMISSION_REVOKED'}:
            process_item_login_required.delay(item_id)
        else:
            logger.info('Unhandled Plaid webhook event: %s', payload)

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

