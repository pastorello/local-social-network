from django.contrib import admin

from .models import Termine


@admin.register(Termine)
class TermineAdmin(admin.ModelAdmin):
    list_display = ('term', 'card')
    search_fields = ('term', 'meaning', 'card__title')
