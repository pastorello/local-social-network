import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

# A GeoJSON document big enough to be a denial-of-service is not a boundary
# file anyone drew by hand; the quartieri of a town this size are a few tens
# of kB. Checked on the way in (admin form) rather than on the way out.
MAX_GEOJSON_BYTES = 2 * 1024 * 1024

GEOJSON_TYPES = ('FeatureCollection', 'Feature', 'Polygon', 'MultiPolygon', 'GeometryCollection')


def geojson_positions(node):
    """Every [lng, lat] pair in a GeoJSON document, whatever wraps it.

    Deliberately structural rather than schema-aware: the point is to reach the
    numbers, and a document that nests them differently than expected simply
    yields nothing rather than raising.
    """
    if isinstance(node, dict):
        for key in ('features', 'geometries', 'geometry', 'coordinates'):
            if key in node:
                yield from geojson_positions(node[key])
    elif isinstance(node, (list, tuple)):
        if (
            len(node) >= 2
            and isinstance(node[0], (int, float))
            and isinstance(node[1], (int, float))
            and not isinstance(node[0], bool)
        ):
            yield node[0], node[1]
        else:
            for item in node:
                yield from geojson_positions(item)


def implausible_position(geojson):
    """The first coordinate that cannot be this town, or None.

    GeoJSON is **[longitude, latitude]**. A file written the other way round is
    structurally valid, so nothing here used to object: it saved, and the layer
    was simply invisible — Gaeta's own boundaries, swapped, land off the coast
    of Somalia. That is a bad way to find out, and the error message below is
    most of the value of this check.
    """
    lat0, lng0 = settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG
    span = settings.MAP_PLAUSIBLE_DEGREES

    for lng, lat in geojson_positions(geojson):
        if abs(lat - lat0) > span or abs(lng - lng0) > span:
            return lng, lat
    return None


class OverlayQuerySet(models.QuerySet):
    def visible_to(self, user):
        """The whole enforcement of spec politics.md, in one place.

        Everything else about the steering tier is omission — no badge, no
        field, no menu entry. This is the part that actually protects it, and
        it runs against the database on every request, never against a role
        the client sent us. Anonymous readers see public overlays; approved
        collaborators also see the internal ones; the steering tier and the
        admin see everything.
        """
        from account.models import User

        if not getattr(user, 'is_authenticated', False):
            return self.filter(visibility=Overlay.PUBLIC)
        if user.role == User.ADMIN or user.is_steering:
            return self.all()
        return self.filter(visibility__in=(Overlay.PUBLIC, Overlay.COLLABORATORS))


class Overlay(models.Model):
    """One mechanism, two kinds (spec map.md M3).

    A *vector* overlay is a GeoJSON document — the quartieri and the seggi
    elettorali; a *raster* overlay is a georeferenced historical map of Gaeta
    drawn over the base tiles inside its bounding box. They share a model
    because they share everything the reader touches: a name, a toggle, an
    opacity and — the part with teeth — a visibility.

    **Visibility is the gate, not the hiding** (spec politics.md). The default
    is the most restrictive tier on purpose: a newly created overlay is
    invisible to the public until an admin explicitly says otherwise, so
    publishing one is always a deliberate act and never a side effect of
    creating it (M4).
    """

    RASTER = 'raster'
    VECTOR = 'vector'

    KIND_CHOICES = (
        (RASTER, 'Raster (mappa storica georeferenziata)'),
        (VECTOR, 'Vector (poligoni GeoJSON)'),
    )

    PUBLIC = 'public'
    COLLABORATORS = 'collaborators'
    STEERING = 'steering'

    VISIBILITY_CHOICES = (
        (PUBLIC, 'Pubblico — visibile a chiunque'),
        (COLLABORATORS, 'Interno — visibile ai collaboratori'),
        (STEERING, 'Riservato — visibile solo al gruppo ristretto'),
    )

    objects = OverlayQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=STEERING)
    position = models.PositiveIntegerField(default=0)

    # Vector only.
    geojson = models.JSONField(null=True, blank=True)
    # The palette's sea (`--color-sea` in the SPA's main.css), not a layer's
    # colour: the old default, #7c3aed, was the retired brand purple and all
    # but the personaggi layer's, so a boundary read as a run of their pins.
    # A default only — the admin picks each overlay's colour.
    color = models.CharField(max_length=7, default='#0f5f73')

    # Raster only: the image plus the bounding box it is georeferenced to.
    image = models.ImageField(upload_to='overlays', blank=True)
    south = models.FloatField(null=True, blank=True)
    west = models.FloatField(null=True, blank=True)
    north = models.FloatField(null=True, blank=True)
    east = models.FloatField(null=True, blank=True)

    opacity = models.FloatField(default=0.6)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('position', 'name')
        # The admin is a surface the author reads (N4). Without these Django
        # builds its own messages from the class name — "Il overlay ... è stato
        # aggiunto", which is not Italian.
        verbose_name = 'sovrapposizione'
        verbose_name_plural = 'sovrapposizioni'

    def __str__(self):
        return self.name

    def get_image_url(self):
        return settings.WEBSITE_URL + self.image.url if self.image else None

    @property
    def bounds(self):
        """Leaflet's `ImageOverlay` bounds: [[south, west], [north, east]]."""
        if self.kind != self.RASTER or None in (self.south, self.west, self.north, self.east):
            return None
        return [[self.south, self.west], [self.north, self.east]]

    def clean(self):
        # Validation lives here rather than in a serializer because the write
        # path is Django admin (spec map.md: the author sources the boundaries
        # and the scans; there is no collaborator-facing overlay editor).
        errors = {}

        if not 0.0 <= self.opacity <= 1.0:
            errors['opacity'] = 'L’opacità deve essere compresa tra 0 e 1.'

        if self.kind == self.VECTOR:
            if not isinstance(self.geojson, dict) or self.geojson.get('type') not in GEOJSON_TYPES:
                errors['geojson'] = 'Serve un documento GeoJSON valido (FeatureCollection, Feature, Polygon…).'
            elif len(str(self.geojson)) > MAX_GEOJSON_BYTES:
                errors['geojson'] = (
                    f'Il GeoJSON è troppo grande (massimo '
                    f'{MAX_GEOJSON_BYTES // (1024 * 1024)} MB). Semplifica la geometria '
                    f'— in QGIS, «Semplifica» — o riduci i decimali delle coordinate: '
                    f'sei ne bastano, sono circa 10 cm.'
                )
            elif (outlier := implausible_position(self.geojson)) is not None:
                lng, lat = outlier
                errors['geojson'] = (
                    f'Le coordinate non sono da queste parti: il primo punto fuori '
                    f'zona è longitudine {lng}, latitudine {lat}. Il GeoJSON vuole '
                    f'l’ordine [longitudine, latitudine] — se il file le ha invertite, '
                    f'è questo il problema.'
                )
        elif self.kind == self.RASTER:
            if not self.image:
                errors['image'] = 'Una sovrapposizione raster ha bisogno di un’immagine.'
            if None in (self.south, self.west, self.north, self.east):
                errors['south'] = 'Servono tutti e quattro i limiti geografici.'
            elif self.south >= self.north or self.west >= self.east:
                errors['south'] = 'I limiti non sono coerenti: sud < nord e ovest < est.'

        if errors:
            raise ValidationError(errors)
