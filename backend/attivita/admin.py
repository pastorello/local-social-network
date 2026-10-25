from django.contrib import admin

from .models import Attivita


@admin.register(Attivita)
class AttivitaAdmin(admin.ModelAdmin):
    list_display = ('card', 'kind')
    list_filter = ('kind',)
    search_fields = ('card__title',)
