"""Which editorial zones a card is in (spec cosa-fare.md Part −1, D2).

Pure Python on purpose: a handful of hand-drawn polygons over a few hundred
pins needs no GIS stack, and the rule is easier to read as code than as a
spatial query. GeoJSON is [longitude, latitude] throughout.
"""


def _in_ring(lat, lng, ring):
    # Ray casting: count how many edges a ray east from the point crosses.
    inside = False
    count = len(ring)
    for i in range(count):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % count][0], ring[(i + 1) % count][1]
        if (y1 > lat) != (y2 > lat):
            crossing = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
            if lng < crossing:
                inside = not inside
    return inside


def _in_polygon(lat, lng, rings):
    # The first ring is the outline; any further ring is a hole.
    if not rings or not _in_ring(lat, lng, rings[0]):
        return False
    return not any(_in_ring(lat, lng, hole) for hole in rings[1:])


def geometry_contains(geometry, lat, lng):
    kind = geometry.get('type')
    if kind == 'Polygon':
        return _in_polygon(lat, lng, geometry['coordinates'])
    if kind == 'MultiPolygon':
        return any(_in_polygon(lat, lng, polygon) for polygon in geometry['coordinates'])
    return False


def _holds_any(zone, points):
    return any(geometry_contains(zone.geometry, point['lat'], point['lng']) for point in points)


def zones_containing_any(zones, points):
    """The slugs of the zones holding at least one of `points` ({lat, lng}),
    in the zones' own order."""
    return [zone.slug for zone in zones if _holds_any(zone, points)]


def named_zones_containing_any(zones, points):
    """The same zones with their names, `{slug, name, name_en}` — what a
    place's card says under «Dove si trova» (review PR-3), where a slug means
    nothing. `name_en` is blank for a proper name (review PR-19a)."""
    return [
        {'slug': zone.slug, 'name': zone.name, 'name_en': zone.name_en}
        for zone in zones if _holds_any(zone, points)
    ]


def zones_of_feature(zones, type_key, points, route):
    """D2's rule for a card on the map: a place by its pin, a festa where its
    route passes — any of its stops inside a zone. The festa test is by vertex:
    a route that crosses a zone between two stops without stopping in it is
    not "passing through" anywhere a reader would be told to go."""
    if type_key == 'feste':
        return zones_containing_any(zones, route)
    return zones_containing_any(zones, points)
