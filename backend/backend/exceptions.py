from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    """Normalize API errors to the spec §8 shape: {"detail": str, "fields"?: {...}}.

    DRF already returns {"detail": ...} for auth/permission/404 errors; this
    wraps field validation errors the same way instead of DRF's bare
    {field: [messages]} body.
    """
    response = drf_exception_handler(exc, context)

    if response is not None and isinstance(exc, ValidationError):
        data = response.data
        if not isinstance(data, dict):
            data = {'non_field_errors': data}
        response.data = {'detail': 'Dati non validi.', 'fields': data}

    return response
