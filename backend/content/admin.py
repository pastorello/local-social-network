from django import forms
from django.contrib import admin

from content.models import Card, CardImage
from content.publishing import publish_problems


class CardImageInline(admin.TabularInline):
    model = CardImage
    extra = 0


class CardAdminForm(forms.ModelForm):
    """Publishing from here obeys the rules every type's API applies before
    it writes `is_published` (TD-49): T8's original-first, and whatever a type
    app registered — a tour's I4. Checked after the instance is built, so a
    rule sees the card as it would be saved, `translation_of` included."""

    class Meta:
        model = Card
        fields = '__all__'

    def _post_clean(self):
        super()._post_clean()
        if 'is_published' not in self.cleaned_data:
            return
        for message in publish_problems(self.instance):
            self.add_error('is_published', message)


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
    form = CardAdminForm
