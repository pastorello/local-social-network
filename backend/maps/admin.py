from django import forms
from django.contrib import admin

from common.images import ImageRejected, validate_image

from .models import Overlay, Zona, ZonaAlias


class OverlayAdminForm(forms.ModelForm):
    class Meta:
        model = Overlay
        fields = '__all__'

    def clean_image(self):
        # Same hardening every other upload path in this codebase gets
        # (TD-12): one validator, no per-path exceptions — including this one,
        # whose uploader is the admin. The 5 MB cap applies here too; a scan
        # that large wants downsampling before georeferencing anyway.
        image = self.cleaned_data.get('image')
        if not image or not hasattr(image, 'file'):
            return image
        try:
            return validate_image(image)
        except ImageRejected as exc:
            raise forms.ValidationError(str(exc)) from exc

    def _post_clean(self):
        # A rejected upload used to produce *two* messages: the real one ("il
        # file non può superare i 5 MB") and, underneath it, the model's
        # "una sovrapposizione raster ha bisogno di un’immagine" — because the
        # rejected file never reached `cleaned_data`, so the model's own check
        # saw an empty field. The second one is false: an image *was* attached,
        # and it sends the reader looking for a different problem.
        super()._post_clean()

        # Any error on the field, not only ours: Django rejects a corrupt file
        # before `clean_image` ever runs, and the same false message followed.
        if self._errors.get('image'):
            kept = [e for e in self._errors['image'] if 'bisogno di un' not in e]
            if kept:
                self._errors['image'] = self.error_class(kept)


@admin.register(Overlay)
class OverlayAdmin(admin.ModelAdmin):
    form = OverlayAdminForm
    list_display = ('name', 'kind', 'visibility', 'position')
    list_filter = ('kind', 'visibility')
    search_fields = ('name',)
    fieldsets = (
        (None, {'fields': ('name', 'kind', 'visibility', 'position', 'opacity')}),
        ('Vector (GeoJSON)', {'fields': ('geojson', 'color')}),
        ('Raster (mappa storica)', {'fields': ('image', 'south', 'west', 'north', 'east')}),
    )


@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    """The editorial zones (spec cosa-fare.md Part −1, D2). Seeded on
    2026-10-13 and redrawn on OpenStreetMap on 2026-10-14 (migration 0006),
    still indicative: correct them here. A card joins a zone by where its pin
    is, so moving a boundary moves cards between zones with no other edit."""

    list_display = ('name', 'name_en', 'slug', 'position')
    list_editable = ('position',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(ZonaAlias)
class ZonaAliasAdmin(admin.ModelAdmin):
    """The names «Dove sei?» knows (review of 2026-10-22, decision 3), each
    with the zone the place is in. Before adding one, find the place on the map
    and check which zone's outline holds it: a street on a border, or a word
    for two places, sends half the guests who type it to the wrong zone."""

    list_display = ('name', 'zona', 'position')
    list_editable = ('position',)
    list_filter = ('zona',)
    search_fields = ('name',)
