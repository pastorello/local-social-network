from django.contrib import admin

from .models import Termine


@admin.register(Termine)
class TermineAdmin(admin.ModelAdmin):
    list_display = ('card',)
    search_fields = ('meaning', 'card__title')
