"""
Central timeline logging. Call this from views/serializers when key events happen.
Every sale, payment, loan payment, refund, expense, order, transfer, repair is recorded with created_at.
"""
from main.models import TimelineEvent


def log_timeline(event_type, entity_type, entity_id, description, user=None, details=None):
    """Record one event on the timeline. details can be a dict (e.g. amount, sale_id)."""
    TimelineEvent.objects.create(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        user=user,
        description=description,
        details=details or {},
    )
