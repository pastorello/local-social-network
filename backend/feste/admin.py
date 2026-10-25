from django.contrib import admin

from .models import Edizione, Feste


class EdizioneInline(admin.TabularInline):
    """This year's date, typed by hand (D9, K2) — the same rules as the
    festa's form, from `Edizione.clean`."""

    model = Edizione
    extra = 0
    fields = ('start_date', 'end_date', 'note')


@admin.register(Feste)
class FesteAdmin(admin.ModelAdmin):
    list_display = ('card', 'recurrence')
    search_fields = ('card__title', 'recurrence')
    inlines = (EdizioneInline,)
