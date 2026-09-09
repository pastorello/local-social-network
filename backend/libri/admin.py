from django.contrib import admin

from .models import Libro


@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ('card', 'book_author', 'year')
    search_fields = ('book_author', 'publisher', 'card__title')
