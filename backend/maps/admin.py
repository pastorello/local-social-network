from django import forms
from django.contrib import admin

from common.images import ImageRejected, validate_image

from .models import Overlay


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
