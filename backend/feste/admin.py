from django.contrib import admin

from .models import Feste


@admin.register(Feste)
class FesteAdmin(admin.ModelAdmin):
    list_display = ('card', 'recurrence')
    search_fields = ('card__title', 'recurrence')
