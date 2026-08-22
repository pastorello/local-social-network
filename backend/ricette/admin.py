from django.contrib import admin

from .models import Ricetta


@admin.register(Ricetta)
class RicettaAdmin(admin.ModelAdmin):
    list_display = ('card', 'servings')
    search_fields = ('card__title', 'ingredients')
