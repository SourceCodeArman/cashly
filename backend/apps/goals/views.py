"""
Views for goals app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from django.utils import timezone
from decimal import Decimal
from django.shortcuts import get_object_or_404

from .models import Goal, Contribution
from .serializers import (
    GoalSerializer,
    GoalCreateSerializer,
    GoalContributeSerializer,
    ContributionSerializer,
    ContributionCreateSerializer,
)
from .utils import calculate_goal_forecast, calculate_monthly_contribution
from .services import sync_destination_account_balance
from apps.api.permissions import IsOwnerOrReadOnly
from apps.accounts.plaid_service import PlaidService
from apps.accounts.plaid_utils import PlaidIntegrationError


class ContributionListCreateView(ListCreateAPIView):
    """
    List and create contributions for a goal.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContributionSerializer
    lookup_field = 'goal_pk'
    lookup_url_kwarg = 'goal_pk'
    
    def get_queryset(self):
        """Return contributions for the goal."""
        goal_id = self.kwargs.get('goal_pk')
        if not goal_id:
            return Contribution.objects.none()
        goal = get_object_or_404(Goal, goal_id=goal_id, user=self.request.user)
        return Contribution.objects.filter(goal=goal, user=self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method == 'POST':
            return ContributionCreateSerializer
        return ContributionSerializer
    
    def get_serializer_context(self):
        """Add goal context to serializer."""
        context = super().get_serializer_context()
        goal_id = self.kwargs.get('goal_pk')
        if goal_id:
            goal = get_object_or_404(Goal, goal_id=goal_id, user=self.request.user)
            context['goal'] = goal
        return context
    
    def perform_create(self, serializer):
        """Set goal and user automatically on create."""
        goal_id = self.kwargs.get('goal_pk')
        if not goal_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Goal ID is required')
        goal = get_object_or_404(Goal, goal_id=goal_id, user=self.request.user)
        
        # Get date from request or use today
        date = serializer.validated_data.get('date')
        if not date:
            date = timezone.now().date()
        
        serializer.save(
            goal=goal,
            user=self.request.user,
            source='manual',
            date=date
        )
    
    def list(self, request, *args, **kwargs):
        """List contributions for a goal."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Contributions retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
        """Create contribution and return response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use ContributionSerializer for response
        contribution = serializer.instance
        response_serializer = ContributionSerializer(contribution, context={'request': request})
        
        return Response({
            'status': 'success',
            'data': response_serializer.data,
            'message': 'Contribution created successfully'
        }, status=status.HTTP_201_CREATED)


class ContributionDetailView(RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a contribution.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContributionSerializer
    lookup_field = 'contribution_id'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        """Return contributions for the goal."""
        goal_id = self.kwargs.get('goal_pk')
        if not goal_id:
            return Contribution.objects.none()
        goal = get_object_or_404(Goal, goal_id=goal_id, user=self.request.user)
        return Contribution.objects.filter(goal=goal, user=self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method in ['PUT', 'PATCH']:
            return ContributionCreateSerializer
        return ContributionSerializer
    
    def get_object(self):
        """Get contribution object using contribution_id from URL."""
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a contribution."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Contribution retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Update contribution (only manual contributions can be updated)."""
        instance = self.get_object()
        if instance.source != 'manual':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only manual contributions can be updated')
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Refresh instance to get updated data
        instance.refresh_from_db()
        response_serializer = ContributionSerializer(instance, context={'request': request})
        return Response({
            'status': 'success',
            'data': response_serializer.data,
            'message': 'Contribution updated successfully'
        }, status=status.HTTP_200_OK)
    
    def partial_update(self, request, *args, **kwargs):
        """Partially update a contribution."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete contribution (only manual contributions can be deleted)."""
        instance = self.get_object()
        if instance.source != 'manual':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only manual contributions can be deleted')
        instance.delete()
        return Response({
            'status': 'success',
            'data': None,
            'message': 'Contribution deleted successfully'
        }, status=status.HTTP_200_OK)


class GoalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Goal management.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """Return goals for the current user."""
        queryset = Goal.objects.filter(user=self.request.user)
        
        # For archive/unarchive actions, include all goals (including archived)
        # so that get_object() can find them
        if self.action in ['archive', 'unarchive']:
            # Don't filter by archived_at for these actions
            pass
        else:
            # Filter by is_active if specified
            is_active = self.request.query_params.get('is_active', None)
            if is_active is not None:
                is_active_bool = is_active.lower() == 'true'
                queryset = queryset.filter(is_active=is_active_bool)
            else:
                # Default to active goals only (not archived)
                queryset = queryset.filter(archived_at__isnull=True)
        
        # Filter by is_completed if specified (but not for archive/unarchive actions)
        if self.action not in ['archive', 'unarchive']:
            is_completed = self.request.query_params.get('is_completed', None)
            if is_completed is not None:
                is_completed_bool = is_completed.lower() == 'true'
                queryset = queryset.filter(is_completed=is_completed_bool)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return GoalCreateSerializer
        return GoalSerializer
    
    def create(self, request, *args, **kwargs):
        """Create goal and return full GoalSerializer response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use GoalSerializer for response to include all computed fields
        goal = serializer.instance
        response_serializer = GoalSerializer(goal, context={'request': request})
        
        return Response({
            'status': 'success',
            'data': response_serializer.data,
            'message': 'Goal created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set user automatically on create and sync destination account balance if provided."""
        goal = serializer.save(user=self.request.user, current_amount=Decimal('0.00'), is_completed=False)
        
        # If destination account is provided, sync its balance
        if goal.destination_account:
            try:
                # Sync destination account balance
                balance = sync_destination_account_balance(goal)
                goal.current_amount = balance
                goal.initial_balance_synced = True
                goal.save(update_fields=['current_amount', 'initial_balance_synced'])
            except Exception as e:
                # Log error but don't fail goal creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to sync destination account balance for goal {goal.goal_id}: {e}")
                # Goal will start with 0.00, user can sync manually later
        
        # Check if goal is already completed (target reached)
        if goal.current_amount >= goal.target_amount:
            goal.complete()
    
    def update(self, request, *args, **kwargs):
        """Update goal and return full GoalSerializer response."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Use GoalSerializer for response to include all computed fields
        goal = serializer.instance
        response_serializer = GoalSerializer(goal, context={'request': request})
        
        return Response({
            'status': 'success',
            'data': response_serializer.data,
            'message': 'Goal updated successfully'
        }, status=status.HTTP_200_OK)
    
    def perform_update(self, serializer):
        """Update goal and handle completion."""
        old_destination_account = serializer.instance.destination_account
        goal = serializer.save()
        
        # Handle destination account changes
        new_destination_account = goal.destination_account
        if old_destination_account != new_destination_account:
            if new_destination_account is None:
                # Changed from account to cash: revoke transfer authorization
                goal.transfer_authorized = False
                goal.save(update_fields=['transfer_authorized'])
            elif old_destination_account is None:
                # Changed from cash to account: require authorization
                goal.transfer_authorized = False
                goal.is_active = False
                goal.save(update_fields=['transfer_authorized', 'is_active'])
                # Sync new destination account balance
                try:
                    balance = sync_destination_account_balance(goal)
                    goal.current_amount = balance
                    goal.initial_balance_synced = True
                    goal.save(update_fields=['current_amount', 'initial_balance_synced'])
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to sync destination account balance for goal {goal.goal_id}: {e}")
            else:
                # Changed destination account: sync new balance
                try:
                    balance = sync_destination_account_balance(goal)
                    goal.current_amount = balance
                    goal.initial_balance_synced = True
                    goal.save(update_fields=['current_amount', 'initial_balance_synced'])
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to sync destination account balance for goal {goal.goal_id}: {e}")
        
        # Check if goal should be marked as completed manually
        is_completed = serializer.validated_data.get('is_completed')
        if is_completed is not None:
            if is_completed and not goal.is_completed:
                goal.complete()
            elif not is_completed and goal.is_completed:
                goal.is_completed = False
                goal.completed_at = None
                goal.save(update_fields=['is_completed', 'completed_at', 'updated_at'])
        
        # Sync contributions to ensure current_amount is accurate
        # sync_contributions() will automatically complete the goal if target is reached
        goal.sync_contributions()
    
    @action(detail=True, methods=['post'])
    def contribute(self, request, pk=None):
        """
        POST /api/v1/goals/:id/contribute
        Record manual contribution to goal (deprecated - use contributions endpoint).
        """
        goal = self.get_object()
        serializer = GoalContributeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        contribution_amount = serializer.validated_data['amount']
        contribution_date = serializer.validated_data.get('date', timezone.now().date())
        contribution_note = serializer.validated_data.get('note', '')
        
        # Create contribution record
        contribution = Contribution.objects.create(
            goal=goal,
            user=request.user,
            amount=contribution_amount,
            date=contribution_date,
            note=contribution_note,
            source='manual'
        )
        
        # Goal current_amount is automatically synced by Contribution.save()
        goal.refresh_from_db()
        
        return Response({
            'status': 'success',
            'data': {
                'contribution_id': str(contribution.contribution_id),
                'goal_id': str(goal.goal_id),
                'contribution': float(contribution_amount),
                'current_amount': float(goal.current_amount),
                'target_amount': float(goal.target_amount),
                'progress_percentage': goal.progress_percentage(),
            },
            'message': 'Contribution recorded successfully'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        POST /api/v1/goals/:id/complete/
        Mark goal as completed.
        """
        goal = self.get_object()
        goal.complete()
        
        serializer = GoalSerializer(goal, context={'request': request})
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Goal marked as completed'
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Delete goal and return response."""
        instance = self.get_object()
        goal_id = str(instance.goal_id)
        instance.delete()
        
        return Response({
            'status': 'success',
            'data': None,
            'message': 'Goal deleted successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        POST /api/v1/goals/:id/archive/
        Archive goal (can archive any goal, not just completed ones).
        """
        goal = self.get_object()
        goal.archive()
        
        serializer = GoalSerializer(goal, context={'request': request})
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Goal archived successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """
        POST /api/v1/goals/:id/unarchive/
        Restore archived goal.
        """
        goal = self.get_object()
        if not goal.archived_at:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Goal is not archived'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        goal.unarchive()
        
        serializer = GoalSerializer(goal, context={'request': request})
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Goal restored successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def forecast(self, request, pk=None):
        """
        GET /api/v1/goals/:id/forecast/
        Get goal completion forecast.
        """
        goal = self.get_object()
        
        forecast_data = calculate_goal_forecast(goal)
        monthly_recommendation = calculate_monthly_contribution(goal)
        
        # Get contribution statistics
        contributions_by_source = goal.get_contributions_by_source()
        manual_total = goal.get_manual_contributions_total()
        automatic_total = goal.get_automatic_contributions_total()
        
        return Response({
            'status': 'success',
            'data': {
                'goal_id': str(goal.goal_id),
                'forecast': forecast_data,
                'monthly_recommendation': float(monthly_recommendation) if monthly_recommendation else None,
                'is_on_track': goal.is_on_track(),
                'contributions': {
                    'manual_total': float(manual_total),
                    'automatic_total': float(automatic_total),
                    'by_source': list(contributions_by_source),
                },
            },
            'message': 'Forecast retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def contributions(self, request, pk=None):
        """
        GET /api/v1/goals/:id/contributions/
        Get all contributions for a goal.
        """
        goal = self.get_object()
        contributions = Contribution.objects.filter(goal=goal, user=request.user)
        
        serializer = ContributionSerializer(contributions, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Contributions retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='authorize-transfers')
    def authorize_transfers(self, request, pk=None):
        """
        POST /api/v1/goals/:id/authorize-transfers/
        Create transfer authorization programmatically (no Link UI).
        This authorizes future automatic transfers but does NOT execute them immediately.
        """
        goal = self.get_object()
        
        if not goal.destination_account:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Goal must have a destination account to authorize transfers'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not goal.contribution_rules or not goal.contribution_rules.get('enabled'):
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Goal must have contribution rules enabled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        source_accounts = goal.contribution_rules.get('source_accounts', [])
        if not source_accounts:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Goal must have at least one source account configured'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, use the first source account
        # TODO: Support multiple source accounts (may need multiple authorizations)
        first_source = source_accounts[0]
        source_account_id = first_source.get('account_id')
        source_rule = first_source.get('rule', {})
        
        if not source_account_id:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Invalid source account configuration'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transfer amount from contribution rule
        # Default to $1.00 for authorization (actual transfers can be different)
        transfer_amount = '1.00'
        if source_rule.get('type') in ['fixed_monthly', 'fixed_weekly', 'fixed_daily']:
            rule_amount = source_rule.get('amount', 1.00)
            transfer_amount = f"{float(rule_amount):.2f}"
        elif source_rule.get('amount'):
            # For other rule types, use the amount if specified
            transfer_amount = f"{float(source_rule.get('amount', 1.00)):.2f}"
        
        try:
            from apps.accounts.plaid_utils import create_transfer_authorization
            from .models import TransferAuthorization
            from apps.accounts.plaid_utils import encrypt_token
            
            # Create transfer authorization programmatically (no Link UI)
            # This does NOT execute a transfer - it only authorizes future transfers
            auth_result = create_transfer_authorization(
                user=request.user,
                source_account_id=source_account_id,
                destination_account_id=str(goal.destination_account.account_id),
                amount=transfer_amount,
                goal_id=str(goal.goal_id)
            )
            
            # Store the authorization for future use
            transfer_auth = TransferAuthorization.objects.create(
                goal=goal,
                authorization_token=encrypt_token(auth_result['authorization_id']),  # Store encrypted authorization ID
                plaid_authorization_id=auth_result['authorization_id'],
                status='active'
            )
            
            # Mark goal as authorized and active
            # IMPORTANT: Only update these fields, don't trigger any completion logic
            # We explicitly exclude current_amount and is_completed to prevent auto-completion
            goal.transfer_authorized = True
            goal.is_active = True
            # Use update_fields to prevent any side effects from save() method
            # This ensures we don't accidentally trigger sync_contributions or completion logic
            Goal.objects.filter(goal_id=goal.goal_id).update(
                transfer_authorized=True,
                is_active=True
            )
            # Refresh from DB to get updated values
            goal.refresh_from_db()
            
            serializer = GoalSerializer(goal, context={'request': request})
            return Response({
                'status': 'success',
                'data': {
                    'goal': serializer.data,
                    'authorization_id': auth_result['authorization_id'],
                    'decision': auth_result.get('decision'),
                    'message': 'Transfer authorization created successfully. Future transfers will be executed automatically.'
                },
                'message': 'Transfer authorization created successfully'
            }, status=status.HTTP_200_OK)
            
        except PlaidIntegrationError as e:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to create transfer authorization: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating transfer authorization link token: {e}")
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to create transfer authorization: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='complete-authorization')
    def complete_authorization(self, request, pk=None):
        """
        POST /api/v1/goals/:id/complete-authorization/
        Complete transfer authorization after user approves in Plaid Link.
        """
        goal = self.get_object()
        
        public_token = request.data.get('public_token')
        metadata = request.data.get('metadata', {})
        
        if not public_token:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Public token required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.accounts.plaid_utils import exchange_public_token, encrypt_token
            from .models import TransferAuthorization
            
            # For transfer authorization via Link UI:
            # The public_token contains the authorization information
            # We store this to use for future automatic transfers
            # The transfer intent ID is in the metadata from the Link flow
            
            # Extract transfer intent ID and authorization ID from metadata
            transfer_intent_id = metadata.get('transfer_intent_id') or metadata.get('transfer', {}).get('intent_id')
            authorization_id = metadata.get('authorization_id') or metadata.get('transfer', {}).get('authorization_id')
            
            # Store the authorization for future use
            # This authorization allows us to create transfers programmatically later
            transfer_auth = TransferAuthorization.objects.create(
                goal=goal,
                authorization_token=encrypt_token(public_token),  # Store encrypted public token/authorization
                plaid_authorization_id=authorization_id or transfer_intent_id or '',
                status='active'
            )
            
            # IMPORTANT: Mark goal as authorized but DO NOT execute transfer immediately
            # The authorization is stored for future automatic transfers
            # Actual transfers will be created separately using process_contribution_rules
            goal.transfer_authorized = True
            goal.is_active = True
            goal.save(update_fields=['transfer_authorized', 'is_active'])
            
            logger.info(f"Transfer authorization stored for goal {goal.goal_id}. Future transfers will use this authorization.")
            
            serializer = GoalSerializer(goal, context={'request': request})
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': 'Transfer authorization completed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error completing transfer authorization: {e}")
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to complete authorization: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='sync-balance')
    def sync_balance(self, request, pk=None):
        """
        POST /api/v1/goals/:id/sync-balance/
        Manually sync destination account balance.
        """
        goal = self.get_object()
        
        if not goal.destination_account:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Goal must have a destination account to sync balance'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            balance = sync_destination_account_balance(goal)
            goal.refresh_from_db()
            
            serializer = GoalSerializer(goal, context={'request': request})
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': f'Balance synced successfully: ${balance:,.2f}'
            }, status=status.HTTP_200_OK)
        except PlaidIntegrationError as e:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to sync balance: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error syncing balance for goal {goal.goal_id}: {e}")
            return Response({
                'status': 'error',
                'data': None,
                'message': 'An unexpected error occurred while syncing balance'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
