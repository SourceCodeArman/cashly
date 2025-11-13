"""
Helpers for mocking Plaid responses in tests.
"""
from unittest.mock import MagicMock, patch

from apps.accounts import plaid_config


def build_plaid_account(account_id='test-account', **overrides):
    account = {
        'account_id': account_id,
        'balances': {
            'available': 1250.45,
            'current': 1275.45,
            'iso_currency_code': 'USD',
        },
        'mask': '1234',
        'name': 'Test Checking',
        'official_name': 'Test Checking Account',
        'type': 'depository',
        'subtype': 'checking',
    }
    account.update(overrides)
    return account


def build_item(item_id='test-item', products=None, **overrides):
    item = {
        'item': {
            'item_id': item_id,
            'institution_id': 'ins_1',
            'products': products or ['transactions', 'auth'],
        }
    }
    if overrides:
        item['item'].update(overrides)
    return item


class MockPlaidClient:
    """
    Minimal mock Plaid client to simulate API responses in unit tests.
    """

    def __init__(self):
        self._responses = {}

    def register(self, method_name, response):
        self._responses[method_name] = response

    def __getattr__(self, item):
        if item in self._responses:
            return MagicMock(return_value=self._responses[item])
        raise AttributeError(f"No mock registered for {item}")


def mock_plaid_client(responses):
    """
    Context manager for patching get_plaid_client to return mocked responses.
    """
    client = MockPlaidClient()
    for method_name, response in responses.items():
        client.register(method_name, response)

    return patch.object(plaid_config, 'get_plaid_client', return_value=client)

