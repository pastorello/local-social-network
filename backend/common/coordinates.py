import math

from rest_framework import serializers


class CoordinateField(serializers.FloatField):
    """A latitude or longitude. DRF's `FloatField` accepts "nan" — every
    comparison with NaN is false, so `min_value`/`max_value` let it through —
    and a NaN stored on Postgres makes every response that carries it fail to
    render, which for a pin means `/api/map/features/` answers 500 to every
    visitor (TD-46). "inf" is refused by the bounds already; NaN is not."""

    default_error_messages = {'not_finite': 'Coordinata non valida.'}

    def __init__(self, axis, **kwargs):
        bound = 90.0 if axis == 'lat' else 180.0
        super().__init__(min_value=-bound, max_value=bound, **kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not math.isfinite(value):
            self.fail('not_finite')
        return value
