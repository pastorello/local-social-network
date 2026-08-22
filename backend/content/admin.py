from django.contrib import admin

from content.models import Card, CardImage


class CardImageInline(admin.TabularInline):
    model = CardImage
    extra = 0


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    """Cross-type visibility only — no approval workflow (ADR ADR-0004, spec
    content.md): collaborators are already vetted, publishing is their own
    call."""

    list_display = ('title', 'author', 'is_published', 'created_at')
    list_filter = ('is_published',)
    search_fields = ('title',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = (CardImageInline,)
