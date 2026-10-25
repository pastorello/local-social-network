from django import forms
from django.contrib import admin

from content.api_helpers import MEDIA_BELONGS_TO_ORIGINAL

from .models import Intent, Itinerario, Stop
from .rules import publish_problem, stop_card_problem, stop_point_problem


@admin.register(Intent)
class IntentAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en', 'slug', 'position')
    list_editable = ('position',)
    prepopulated_fields = {'slug': ('name',)}


class StopInlineFormSet(forms.BaseInlineFormSet):
    """The API's stop rules, on the admin's stops too (TD-49): every stop a
    card with a place, its pin one of that card's own, no stops on a
    translation, and — I4 — no draft stop on a published tour. An admin may
    use any card, as on the API; what they may not do is make a tour the API
    would have refused."""

    def clean(self):
        super().clean()
        if any(self.errors):
            return
        # Unset only when the tour's own form failed, which reports itself.
        tour_card = self.instance.card if self.instance.card_id else None
        cards = []
        for form in self.forms:
            card = form.cleaned_data.get('card')
            if card is None or form.cleaned_data.get('DELETE'):
                continue
            problem = stop_card_problem(card)
            if problem:
                form.add_error('card', problem)
                continue
            problem = stop_point_problem(card, form.cleaned_data.get('point'))
            if problem:
                form.add_error('point', problem)
            cards.append(card)
        if tour_card is None:
            return
        if cards and tour_card.translation_of_id is not None:
            raise forms.ValidationError(MEDIA_BELONGS_TO_ORIGINAL)
        problem = publish_problem(tour_card.is_published, cards)
        if problem:
            raise forms.ValidationError(problem)


class StopInline(admin.TabularInline):
    model = Stop
    formset = StopInlineFormSet
    extra = 0
    autocomplete_fields = ('card',)
    # A pin by id, not a select of every pin of every card in the archive.
    raw_id_fields = ('point',)
    ordering = ('position',)


@admin.register(Itinerario)
class ItinerarioAdmin(admin.ModelAdmin):
    list_display = ('card', 'form', 'duration')
    list_filter = ('form', 'intents')
    search_fields = ('card__title',)
    filter_horizontal = ('intents',)
    inlines = (StopInline,)
