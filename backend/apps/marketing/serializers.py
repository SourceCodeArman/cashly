from rest_framework import serializers
from .models import WaitlistUser

class WaitlistUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistUser
        fields = ['email', 'created_at']
        read_only_fields = ['created_at']
