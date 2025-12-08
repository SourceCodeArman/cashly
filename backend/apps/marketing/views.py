from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import WaitlistUser
from .serializers import WaitlistUserSerializer

class WaitlistUserCreateView(generics.CreateAPIView):
    queryset = WaitlistUser.objects.all()
    serializer_class = WaitlistUserSerializer
    permission_classes = [AllowAny]
