from django.contrib import admin

from .models import Intent, Itinerario, Stop


@admin.register(Intent)
class IntentAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'position')
    list_editable = ('position',)
    prepopulated_fields = {'slug': ('name',)}


class StopInline(admin.TabularInline):
    model = Stop
    extra = 0
    autocomplete_fields = ('card',)
    ordering = ('position',)


@admin.register(Itinerario)
class ItinerarioAdmin(admin.ModelAdmin):
    list_display = ('card', 'form', 'duration')
    list_filter = ('form', 'intents')
    search_fields = ('card__title',)
    filter_horizontal = ('intents',)
    inlines = (StopInline,)
