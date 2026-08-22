from django.contrib import admin

from .models import Personaggio


@admin.register(Personaggio)
class PersonaggioAdmin(admin.ModelAdmin):
    list_display = ('card', 'life_dates')
    search_fields = ('card__title',)
