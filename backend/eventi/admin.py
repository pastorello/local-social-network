from django.contrib import admin

from .models import Evento


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    """The author's own view of the record. The rules are the API's
    (`Evento.clean`); deleting is possible here and nowhere else (CF26)."""

    list_display = ('title', 'start_date', 'end_date', 'state', 'is_published', 'author')
    list_filter = ('state', 'is_published')
    search_fields = ('title', 'place_label', 'card__title')
    date_hierarchy = 'start_date'
    raw_id_fields = ('card',)
