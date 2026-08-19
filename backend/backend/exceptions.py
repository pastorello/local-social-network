from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    """Normalize API errors to the spec §8 shape: {"detail": str, "fields"?: {...}}.

    DRF already returns {"detail": ...} for auth/permission/404 errors; this
    wraps field validation errors the same way instead of DRF's bare
    {field: [messages]} body.
    """
    # DRF's handler only knows APIException, Http404 and PermissionDenied, so
    # Django's own ValidationError — which the ORM raises for a malformed UUID
    # in a query param — escaped as a 500. Views should validate their input
    # before it reaches the ORM; this is the net behind them (TD-14).
    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, 'message_dict') else exc.messages
        exc = ValidationError(detail)

    response = drf_exception_handler(exc, context)

    if response is not None and isinstance(exc, ValidationError):
        data = response.data
        if not isinstance(data, dict):
            data = {'non_field_errors': data}
        response.data = {'detail': 'Dati non validi.', 'fields': data}

    # DRF's throttle message is English; UI copy is Italian (spec N4).
    if response is not None and isinstance(exc, Throttled):
        wait = exc.wait or 0
        response.data = {
            'detail': f'Troppi tentativi. Riprova tra {int(wait)} secondi.',
        }

    return response
