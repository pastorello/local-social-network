from django.contrib import admin

from .models import Genre, Luogo


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_plural', 'name_en', 'slug', 'position')
    list_editable = ('position',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Luogo)
class LuogoAdmin(admin.ModelAdmin):
    list_display = ('card', 'genre')
    list_filter = ('genre',)
    search_fields = ('card__title',)
