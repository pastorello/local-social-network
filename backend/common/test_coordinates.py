"""TD-46: a coordinate is a finite number. DRF's FloatField took "nan", and a
NaN pin on Postgres turns every map response into a 500."""

import json

import pytest
from rest_framework import serializers

from common.coordinates import CoordinateField


class Point(serializers.Serializer):
    lat = CoordinateField('lat')
    lng = CoordinateField('lng')


@pytest.mark.parametrize('value', ['nan', 'NaN', float('nan'), 'inf', '-Infinity', 91, -181])
def test_a_coordinate_that_is_not_a_place_is_refused(value):
    assert not Point(data={'lat': value, 'lng': value}).is_valid()


def test_an_ordinary_coordinate_passes():
    point = Point(data={'lat': '41.2139', 'lng': 13.5711})
    assert point.is_valid(), point.errors
    assert point.validated_data == {'lat': 41.2139, 'lng': 13.5711}


@pytest.mark.django_db
def test_a_nan_pin_is_a_400_not_a_stored_row(make_client, citizen):
    response = make_client(citizen).post(
        '/api/chiese/',
        {
            'title': 'Chiesa',
            'body_html': '<p>Testo.</p>',
            'pins': json.dumps([{'lat': 'nan', 'lng': 13.57}]),
        },
        format='multipart',
    )

    assert response.status_code == 400
