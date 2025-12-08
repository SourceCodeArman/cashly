"""
Cloudflare R2 storage backend for receipts.
"""
import boto3
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class R2Storage(S3Boto3Storage):
    """Custom storage backend for Cloudflare R2."""
    
    bucket_name = settings.R2_BUCKET_NAME
    access_key = settings.R2_ACCESS_KEY_ID
    secret_key = settings.R2_SECRET_ACCESS_KEY
    endpoint_url = settings.R2_ENDPOINT
    region_name = 'auto'  # R2 uses 'auto' for region
    file_overwrite = False
    default_acl = None  # R2 doesn't use ACLs
    
    def __init__(self, **settings_dict):
        super().__init__(**settings_dict)
        # Override the client to use R2 endpoint
        self.client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name
        )
