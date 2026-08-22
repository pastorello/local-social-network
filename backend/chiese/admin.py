from django.contrib import admin

from .models import Chiesa


@admin.register(Chiesa)
class ChiesaAdmin(admin.ModelAdmin):
    list_display = ('card',)
    search_fields = ('card__title',)
