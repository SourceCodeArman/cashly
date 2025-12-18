from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    ChatRequestSerializer,
)
from .services import AIChatService
import uuid


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def send(self, request):
        """
        Send a message to the AI.
        Creates a new conversation if one isn't provided.
        """
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        conversation_id = data.get("conversation_id")
        message_text = data.get("message")

        conversation = None
        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    id=conversation_id, user=request.user
                )
            except Conversation.DoesNotExist:
                pass

        if not conversation:
            # Create new conversation with title based on first message
            title = (
                message_text[:30] + "..." if len(message_text) > 30 else message_text
            )
            conversation = Conversation.objects.create(user=request.user, title=title)

        service = AIChatService(request.user)
        ai_message = service.process_message(conversation, message_text)

        # Return the AI message and the conversation ID
        return Response(
            {
                "conversation_id": conversation.id,
                "message": MessageSerializer(ai_message).data,
            }
        )

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
